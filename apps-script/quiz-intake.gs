/**
 * 投資者性格探索：把網頁送來的資料寫進「測驗回收」，再即時同步到「學生資料庫」與新生名單（v8.3）
 * 放在專案的「程式碼.gs」，整份取代後按 Ctrl+S 儲存，再到「部署 → 管理部署作業 → 鉛筆（編輯）→ 版本：新版本 → 部署」，
 * 網址不會變，config.js 不用改。
 *
 * ⚠ 這個專案還有其他檔案（LeadSync、NewStudentWebsite、NewStudentResultLinks…），本檔會呼叫它們的
 *   refreshOriginalReturnTable_()、refreshNewStudentResultLinks()；只有一個帳號有那些檔案時，見最下面的說明。
 * ⚠ 本檔不定義 doGet：網址的 GET（學生查詢網站、結果頁的「送過資料了沒」回條）由 NewStudentWebsite.gs 負責。
 *
 * 一次作答＝「測驗回收」一列，用「名單編號」串起來：
 *   開始作答前填完聯絡資料 → 新增一列（進度：已填資料，還沒做完）
 *   做完測驗 → 找到同一列，補上類型、分數、學習規劃兩題、結果網址（進度：已完成）
 * 結果頁底部的表單沒有名單編號，照舊每送一次新增一列。
 *
 * 欄位用「表頭文字」對應，不看第幾欄：試算表缺哪一欄就自動加在最右邊。
 * 前 17 欄（送出時間～測驗版本）的順序不能動：LeadSync.gs 的 refreshOriginalReturnTable_ 會檢查這 17 欄再複製到「學生資料庫」。
 */
const SHEET_NAME = "測驗回收";

// [表頭文字, 網頁送來的欄位名稱]；null＝由這支程式自己填
const FIELDS = [
  ["送出時間", null], ["暱稱", "nickname"], ["Email", "email"], ["電話", "phone"],
  ["類型", "type"], ["面對不確定性", "u"], ["做決定的依據", "r"], ["與錢的關係", "m"],
  ["生活階段", "life"], ["投資方式", "practice"], ["投資年資", "years"], ["最想解決", "goal"],
  ["金融小挑戰答對", "know"], ["同意聯繫", "consent"], ["結果網址", "url"], ["作答代碼", "code"], ["測驗版本", "version"],
  // v8.3 新增（加在第 17 欄之後，不影響原本 17 欄）
  ["想了解的投資領域", "interests"], ["每月學習預算", "budget"], ["進度", null], ["完成時間", null], ["名單編號", "lead"], ["年齡", "age"],
];
const TIME_FORMAT = "yyyy/m/d am/pm h:mm:ss";

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.website) return reply_("ok");          // 機器人陷阱欄位有值就直接忽略
  // 在編輯器直接按「執行 doPost」時沒有任何資料，不寫空白列
  if (!p.lead && !p.code && !p.nickname) return reply_("ok");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = sheet_();
    const col = ensureHeaders_(sheet);
    const now = new Date();
    const done = p.stage !== "start";
    let row = p.lead ? findRow_(sheet, col["名單編號"], String(p.lead)) : 0;
    const isNew = !row;
    // 新的一列接在「送出時間」最後一筆的下一列
    if (isNew) row = nextRow_(sheet, col["送出時間"]);
    // 只寫這支程式負責的格子，不整列覆蓋
    const put = (header, v) => sheet.getRange(row, col[header]).setValue(v);
    if (isNew) { put("送出時間", now); sheet.getRange(row, col["送出時間"]).setNumberFormat(TIME_FORMAT); }
    // 有送來的欄位才寫，沒送的保留原值（做完測驗那次不會清掉開始時填的資料）
    FIELDS.forEach(([header, key]) => {
      if (key && p[key] !== undefined && p[key] !== "") put(header, safe_(p[key]));
    });
    put("進度", done ? "已完成" : "已填資料，還沒做完");
    if (done) { put("完成時間", now); sheet.getRange(row, col["完成時間"]).setNumberFormat(TIME_FORMAT); }
    SpreadsheetApp.flush();
    // 跟舊版一樣：原始明細與身分比對先完成（測驗回收前 17 欄 → 學生資料庫），再於釋放收件鎖後更新名單與網站。
    // 舊版這一步出錯會讓整筆送出失敗；這裡改成記錄錯誤、資料照樣保存
    try { refreshOriginalReturnTable_(ss, false); SpreadsheetApp.flush(); }
    catch (error) { noteSyncError_("學生資料庫同步", error); }
    // 新題目（年齡、投資領域、學習預算、進度）另外補到「學生資料庫」S 欄之後
    try { mirrorExtraColumns_(ss); }
    catch (error) { noteSyncError_("學生資料庫新欄位同步", error); }
  } finally {
    lock.releaseLock();
  }
  // 收件已保存；同步失敗不可讓使用者重送同一筆。15 分鐘觸發器會補同步。
  try { refreshNewStudentResultLinks(); }
  catch (error) { noteSyncError_("新生名單同步", error); }
  return reply_("ok");
}

/**
 * 補同步一次：把「測驗回收」目前所有資料重新複製到「學生資料庫」，再更新新生名單。
 * 用在：程式更新前「學生資料庫」漏掉的資料（例如 2026/11/17 那幾列空白的「新生」列）。
 * 用法：上方函式選單選 resyncStudentDatabaseOnce → 執行。不會新增或刪除「測驗回收」的任何資料。
 */
function resyncStudentDatabaseOnce() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // 2026/11/17 舊版收件程式寫的列，「送出時間」只顯示日期；學生資料庫顯示到秒，
    // refreshOriginalReturnTable_ 比對顯示文字時會判定「還原驗證失敗」。先把整欄統一成同一種顯示格式（只改顯示，不改資料）
    const src = sheet_();
    if (src.getLastRow() > 1) src.getRange(2, 1, src.getLastRow() - 1, 1).setNumberFormat(TIME_FORMAT);
    SpreadsheetApp.flush();
    refreshOriginalReturnTable_(ss, false); SpreadsheetApp.flush(); mirrorExtraColumns_(ss);
  }
  finally { lock.releaseLock(); }
  refreshNewStudentResultLinks();
  console.log("學生資料庫與新生名單已補同步");
}

// 「學生資料庫」要看到的新題目欄位（從「測驗回收」同名欄位複製）
const MIRROR_TO_DB = ["年齡", "想了解的投資領域", "每月學習預算", "進度"];

/**
 * 把「測驗回收」的新題目欄位，逐列複製到「學生資料庫」。
 * - 列對齊方式跟 LeadSync.gs 的 refreshOriginalReturnTable_ 一樣：測驗回收第 n 列 ↔ 學生資料庫第 n 列。
 * - 「學生資料庫」A～Q 是原始 17 欄、R 欄（第 18 欄）是新生系統的「本院學生」，都不碰；
 *   新欄位一律放在 S 欄之後，第一次跑時自動加表頭，之後照表頭文字找欄位。
 */
function mirrorExtraColumns_(ss) {
  const src = ss.getSheetByName(SHEET_NAME), db = ss.getSheetByName("學生資料庫");
  if (!src || !db) return;
  const rows = src.getLastRow();
  if (rows < 2) return;
  const sc = headerMap_(src), dc = headerMap_(db);
  let next = Math.max(db.getLastColumn(), 18) + 1;
  if (db.getMaxRows() < rows) db.insertRowsAfter(db.getMaxRows(), rows - db.getMaxRows());
  MIRROR_TO_DB.forEach(h => {
    if (!sc[h]) return;
    let c = dc[h] > 18 ? dc[h] : 0;
    if (!c) {
      c = next++;
      if (db.getMaxColumns() < c) db.insertColumnsAfter(db.getMaxColumns(), c - db.getMaxColumns());
      db.getRange(1, c).setValue(h).setBackground("#17365d").setFontColor("#ffffff").setFontWeight("bold").setWrap(true);
    }
    db.getRange(2, c, rows - 1, 1).setValues(src.getRange(2, sc[h], rows - 1, 1).getValues());
    const extra = db.getLastRow() - rows;
    if (extra > 0) db.getRange(rows + 1, c, extra, 1).clearContent();
  });
}

function noteSyncError_(what, error) {
  PropertiesService.getScriptProperties().setProperty("studentImmediate.lastError",
    new Date().toISOString() + " " + what + "：" + String(error && error.message).slice(0, 250));
  console.error("測驗已保存，" + what + "待補：" + String(error && error.message));
}

// 優先寫「測驗回收」分頁；沒有這個分頁就寫第一個分頁
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

function headerMap_(sheet) {
  const map = {};
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) return map;
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].forEach((h, i) => {
    const name = String(h).trim();
    if (name && !map[name]) map[name] = i + 1;
  });
  return map;
}

// 空白試算表寫入完整表頭；舊試算表只把缺的欄位補在最右邊
function ensureHeaders_(sheet) {
  const map = headerMap_(sheet);
  const missing = FIELDS.map(f => f[0]).filter(h => !map[h]);
  if (missing.length) {
    const start = sheet.getLastColumn() + 1;
    sheet.getRange(1, start, 1, missing.length).setValues([missing]);
    missing.forEach((h, i) => { map[h] = start + i; });
  }
  return map;
}

// 「送出時間」欄最後一個有值的格子的下一列（表頭在第 1 列，所以最少是第 2 列）
function nextRow_(sheet, c) {
  const last = sheet.getLastRow();
  if (last < 2) return 2;
  const vals = sheet.getRange(2, c, last - 1, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (vals[i][0] !== "" && vals[i][0] !== null) return i + 3;
  }
  return 2;
}

function findRow_(sheet, c, lead) {
  if (!c || sheet.getLastRow() < 2) return 0;
  const hit = sheet.getRange(2, c, sheet.getLastRow() - 1, 1).createTextFinder(lead).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

// 以 = + - @ 開頭的字會被試算表當成公式；電話開頭的 0 也會被吃掉，一律當文字存
function safe_(v) {
  if (v instanceof Date) return v;
  const s = String(v == null ? "" : v).slice(0, 2000);
  return /^[=+\-@0]/.test(s) ? "'" + s : s;
}

function reply_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}

/*
 * 第二份試算表（另一個帳號、只有本檔、沒有 LeadSync 那些檔案）：
 * 本檔照樣可以直接用：那邊沒有 refreshOriginalReturnTable_、refreshNewStudentResultLinks，呼叫時的錯誤會被接住，
 * 資料照樣寫進「測驗回收」，只是執行記錄會多一行「待補」。網站查回條只問第一份試算表，第二份不需要 doGet。
 * 想讓執行記錄乾淨一點，可以在那邊的專案「另外新增一個檔案」，貼上下面這段（把每行開頭的 * 拿掉）：
 *
 * function refreshOriginalReturnTable_() {}
 * function refreshNewStudentResultLinks() {}
 * function doGet(e) {
 *   const p = (e && e.parameter) || {};
 *   const cb = String(p.callback || "");
 *   if (!/^[A-Za-z_$][\w$]{0,80}$/.test(cb)) return reply_("ok");
 *   const code = String(p.receipt || "");
 *   let recorded = false;
 *   if (/^8-[a-zA-Z0-9]{1,100}$/.test(code)) {
 *     const sheet = sheet_(), c = headerMap_(sheet)["作答代碼"];
 *     if (c && sheet.getLastRow() > 1) recorded = !!sheet.getRange(2, c, sheet.getLastRow() - 1, 1).createTextFinder(code).matchEntireCell(true).findNext();
 *   }
 *   return ContentService.createTextOutput(cb + "(" + JSON.stringify({ recorded: recorded }) + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
 * }
 */
