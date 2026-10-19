/* 投資者性格探索 v8 簡版：兩頁共用的色彩、作答編碼與本機暫存 */
(function () {
  const Q = window.QUIZ;

  const FONT = '-apple-system,"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
  const CLR = { bg:"#F8F6FC", card:"#FFFFFF", text:"#1F1733", sub:"#6B6580", faint:"#A39DB3", accent:"#6D28D9", accentEnd:"#A78BFA",
    border:"#E7E3F0", progressBg:"#EDE9FE", good:"#16A34A", goodBg:"#F0FDF4", goodLine:"#BBF7D0",
    bad:"#B91C1C", badBg:"#FEF2F2", warn:"#B45309", warnBg:"#FFFBEB", warnLine:"#FDE68A" };
  const TYPE_CLR = {
    開拓者:{m:"#DC2626",bg:"#FEF2F2"}, 策略家:{m:"#2563EB",bg:"#EFF6FF"}, 追浪人:{m:"#0891B2",bg:"#ECFEFF"}, 觀察家:{m:"#7C3AED",bg:"#F5F3FF"},
    深耕者:{m:"#16A34A",bg:"#F0FDF4"}, 磐石:{m:"#475569",bg:"#F1F5F9"}, 取經人:{m:"#B45309",bg:"#FFFBEB"}, 守望者:{m:"#4F46E5",bg:"#EEF2FF"},
  };
  const ROUTE_CLR = { A:"#475569", B:"#16A34A", C:"#7C3AED", D:"#DC2626" };

  // 作答編碼：版本號 + 字串。單選題 1 個數字（任何一組的條件題被跳過都存 9）；複選題 3 位十六進位的位元遮罩
  const CODE_VER = "8";
  const SKIP = 9;
  const groups = () => [["scale", Q.SCALE_QS], ["know", Q.KNOW_QS], ["safe", Q.SAFE_QS], ["pos", Q.POS_QS], ["behav", Q.BEHAV_QS]];

  // 某題依目前作答是否應該跳過（條件題的值可能是複選陣列）
  function isSkipped(q, pos) {
    if (!q.skipIf) return false;
    return Object.entries(q.skipIf).every(([id, val]) => {
      const v = pos[Q.POS_QS.findIndex(x => x.id === id)];
      return Array.isArray(v) ? v.includes(val) : v === val;
    });
  }

  // 複選：勾選互斥選項時清掉其他；勾其他選項時清掉互斥選項
  function toggleMulti(q, current, o) {
    const cur = Array.isArray(current) ? current : [];
    const ex = q.exclusive || [];
    if (cur.includes(o)) return cur.filter(x => x !== o);
    if (ex.includes(o)) return [o];
    return [...cur.filter(x => !ex.includes(x)), o].sort((a, b) => a - b);
  }
  function validMulti(q, v) {
    if (!Array.isArray(v) || !v.length) return false;
    if (v.some(o => o < 0 || o >= q.opts.length)) return false;
    const ex = (q.exclusive || []).filter(o => v.includes(o));
    return ex.length === 0 || v.length === 1;
  }

  function encode(a) {
    let out = "";
    for (const [key, qs] of groups()) {
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i], v = a[key][i];
        if (isSkipped(q, a.pos)) { out += q.multi ? "999" : String(SKIP); continue; }
        if (q.multi) {
          if (!validMulti(q, v)) return null;
          out += v.reduce((m, o) => m | (1 << o), 0).toString(16).padStart(3, "0");
        } else {
          if (v === null || v === undefined) return null;
          out += String(v);
        }
      }
    }
    return CODE_VER + "-" + out;
  }

  function decode(code) {
    if (!code) return null;
    const m = String(code).match(/^(\d+)-([0-9a-f]+)$/);
    if (!m || m[1] !== CODE_VER) return null;
    const str = m[2];
    const a = {};
    let k = 0;
    for (const [key, qs] of groups()) {
      a[key] = [];
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        if (q.multi) {
          const chunk = str.slice(k, k + 3); k += 3;
          if (chunk.length < 3) return null;
          if (chunk === "999") { a[key].push(null); continue; }
          const mask = parseInt(chunk, 16);
          a[key].push(q.opts.map((_, o) => o).filter(o => mask & (1 << o)));
        } else {
          const ch = str[k]; k += 1;
          if (ch === undefined || !/\d/.test(ch)) return null;
          a[key].push(Number(ch) === SKIP ? null : Number(ch));
        }
      }
    }
    if (k !== str.length) return null;
    for (const [key, qs] of groups()) {
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i], v = a[key][i];
        if (isSkipped(q, a.pos)) { if (v !== null) return null; continue; }
        if (q.multi) { if (!validMulti(q, v)) return null; continue; }
        if (v === null || v >= q.opts.length) return null;
      }
    }
    return a;
  }

  // 範例作答：每型配一個符合該型的投資人設定，讓 8 個範例涵蓋 4 條路線與 3 個階段
  // 共同假設：性格特質鮮明、安全墊與基本觀念都到位、沒有風險行為
  const SAMPLE_PROFILE = {
    開拓者:{ practice:"trader",  years:"y3",  goal:"review", source:"own",   life:"mid",   desc:"做短中線交易 3～10 年" },
    追浪人:{ practice:"trying",  years:"lt1", goal:"fit",    source:"media", life:"uni",   desc:"大學生，剛開始小額試著買賣，不到 1 年" },
    策略家:{ practice:"picker",  years:"y3",  goal:"review", source:"own",   life:"mid",   desc:"自己挑個股 3～10 年" },
    觀察家:{ practice:"none",    years:null,  goal:"fit",    source:null,    life:"early", desc:"出社會不久，還沒開始投資" },
    深耕者:{ practice:"picker",  years:"y10", goal:"review", source:"own",   life:"mid",   desc:"挑公司長期持有 10 年以上" },
    取經人:{ practice:"passive", years:"y3",  goal:"system", source:"auto",  life:"early", desc:"出社會幾年，定期定額 3 年以上" },
    磐石:  { practice:"picker",  years:"y3",  goal:"review", source:"own",   life:"mid",   desc:"挑穩定的個股長期持有 3～10 年" },
    守望者:{ practice:"none",    years:null,  goal:"start",  source:null,    life:"hs",    desc:"高中生，還沒開始投資" },
  };
  // 每型選一個最鮮明的面向與三題最極端的答案，讓 8 封範例信引用的題目都不同
  const SAMPLE_STRONG = {
    開拓者:["u4","u5","u6"], 觀察家:["u2","u5","u6"], 守望者:["u1","u5","u2"],
    追浪人:["r1","r5","r4"], 深耕者:["r7","r5","r4"], 取經人:["r3","r5","r4"],
    策略家:["m4","m1","m5"], 磐石:["m6","m1","m5"],
  };
  function sampleProfile(typeName) { return SAMPLE_PROFILE[typeName]; }
  function sampleAnswers(typeName) {
    const key = Object.keys(Q.TYPE_KEY).find(k => Q.TYPE_KEY[k] === typeName);
    const high = { u:key[0] === "1", r:key[1] === "1", m:key[2] === "1" };
    const pf = SAMPLE_PROFILE[typeName];
    const [p1, p2, p3] = Q.POS_QS, [b1, b2] = Q.BEHAV_QS;
    return {
      // 每個面向有幾題選最極端、其餘選次一級，三條光譜才會落在不同位置
      scale: Q.SCALE_QS.map((q) => {
        const strong = SAMPLE_STRONG[typeName].includes(q.id);
        const s = high[q.dim] ? (strong ? 4 : 3) : (strong ? 1 : 2);
        return q.opts.findIndex(o => o.s === s);
      }),
      know: Q.KNOW_QS.map(q => q.answer),
      safe: [Q.SAFE_QS[0].codes.indexOf(pf.life), 3, 3, 3],
      pos: [[p1.codes.indexOf(pf.practice)], pf.years ? p2.codes.indexOf(pf.years) : null, p3.codes.indexOf(pf.goal)],
      behav: [pf.source ? b1.codes.indexOf(pf.source) : null, pf.practice === "none" ? null : [b2.codes.indexOf("none")]],
    };
  }

  const STORE_KEY = "investor-quiz-last-v8-lite";
  function saveLast(code) { try { localStorage.setItem(STORE_KEY, code); } catch (e) {} }
  function loadLast() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }

  // 畫面之間的連結：測驗和結果在同一個檔案裡，只靠網址 # 後面的標記切換，不寫任何檔名，
  // 所以檔案改名、搬資料夾、轉傳都不會連不回來
  const LINK = {
    quiz:"#start",
    types:"#types",
    result:(code, sample) => `#a=${code}${sample ? "&sample=1" : ""}`,
  };
  // 依網址標記決定顯示哪個畫面：有作答代碼或指定看類型 → 結果畫面；其他一律回測驗
  function viewOf(hash) {
    const h = (hash || "").replace(/^#/, "");
    if (h === "types" || new URLSearchParams(h).get("a")) return "result";
    return "quiz";
  }

  window.QUIZ_SHARED = { FONT, CLR, TYPE_CLR, ROUTE_CLR, encode, decode, isSkipped, toggleMulti, validMulti, sampleAnswers, sampleProfile, saveLast, loadLast, LINK, viewOf };
})();
