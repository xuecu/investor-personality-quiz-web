# 收件後端：Google Apps Script

網頁送出的資料由 Google 試算表「投資者性格探索｜測驗回傳表」綁定的 Apps Script 專案「投資屬性測驗資料蒐集」接收，
部署成「網頁應用程式」，網址寫在根目錄 `config.js`（與 `index.html` 內嵌那份）的 `SUBMIT_URL`。

## 這個資料夾放什麼
| 檔案 | 在 Apps Script 專案裡的名稱 | 說明 |
|---|---|---|
| `quiz-intake.gs` | `程式碼.gs` | 收件程式（`doPost`）＋ 補同步函式 `resyncStudentDatabaseOnce` |

同一個 Apps Script 專案裡**還有另一套「新生名單」系統**的 6 個檔案，沒有放進這個公開 repo
（屬於另一套系統，且部分檔案會連外部學員資料庫）：

`AssignmentTimestamp.gs`、`ContactTimestamp.gs`、`LeadSync.gs`、`FinanceRosterAuto.gs`、`NewStudentWebsite.gs`、`NewStudentResultLinks.gs`

`quiz-intake.gs` 會呼叫其中兩個函式：`LeadSync.gs` 的 `refreshOriginalReturnTable_()`、`NewStudentResultLinks.gs` 的 `refreshNewStudentResultLinks()`。

## 資料怎麼流
1. 作答者填完聯絡資料（還沒答題）→ `doPost`（stage=start）在隱藏分頁「測驗回收」新增一列，進度＝「已填資料，還沒做完」
2. 做完測驗 → `doPost`（stage=done）用「名單編號」找到同一列，補上類型、分數、學習規劃兩題、結果網址，進度＝「已完成」
3. 每次收件後即時同步：「測驗回收」前 17 欄 →「學生資料庫」A～Q；新題目（年齡、想了解的投資領域、每月學習預算、進度）→「學生資料庫」S～V；再更新「新生名單」與學生查詢網站
   - 填完聯絡資料就進「學生資料庫」與新生名單（業務要的是聯絡資料，2026-11-17 決定），這時類型、結果欄位是空的

## 部署／更新步驟（要用試算表擁有者的帳號）
1. 試算表 → 擴充功能 → Apps Script → `程式碼.gs` 整份換成 `quiz-intake.gs` → `Ctrl+S`
2. 部署 → **管理部署作業** → 選現有那一筆 → 鉛筆（編輯）→ 版本選「**新版本**」→ 部署
   - **不要按「新增部署作業」**：會產生新網址，網頁還是送到舊網址
3. 有漏同步的資料時：函式選單選 `resyncStudentDatabaseOnce` → 執行

## 踩過的坑（2026-11-17）
- **`doGet` 不在這支程式**：`NewStudentWebsite.gs` 有自己的 `doGet`（學生查詢網站＋結果頁「送過資料了沒」回條），會蓋掉同名函式；所以直接打開部署網址顯示 `Not found` 是正常的。
- **「學生資料庫」前 17 欄與 R 欄不能動**：`refreshOriginalReturnTable_` 會檢查「測驗回收」A～Q 的表頭再複製；R 欄「本院學生」是新生系統寫死在第 18 欄的。新欄位一律放在 S 欄之後。
- **「送出時間」的顯示格式要一致**：`refreshOriginalReturnTable_` 複製後會比對兩邊的「顯示文字」，「測驗回收」A 欄只顯示日期、「學生資料庫」顯示到秒，就會報「原始回傳表還原驗證失敗」。收件程式寫入時會設好格式；補同步前也會先統一整欄格式。
- **舊版收件程式負責即時同步**：新生系統的 15 分鐘同步被 `STUDENT_LOOKUP_SYNC_PAUSED = true` 停掉，「學生資料庫」只靠收件程式即時寫入；改收件程式時不能拿掉同步那兩個呼叫。
- **在編輯器手動執行要有授權**：用沒授權過的帳號執行會跳「需要授權」；擁有者帳號手動執行時，最後「推送學生查詢網站」需要連外權限，沒授權會失敗，但 15 分鐘排程會自動補上。
- 直接在編輯器按「執行 doPost」不會再寫出空白列（沒有資料就略過）。

## 只有收件、沒有新生系統的試算表（例如第二份備援表）
`quiz-intake.gs` 照樣可用：呼叫不到 `refreshOriginalReturnTable_`、`refreshNewStudentResultLinks` 時錯誤會被接住，資料照樣寫進「測驗回收」。檔案最下面的註解有可選的補丁。
