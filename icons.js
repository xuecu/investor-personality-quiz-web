/* 投資者性格探索 簡版：線條圖示（24x24，描邊繪製），兩頁共用 */
(function () {
  const ICONS = {
    // 8 種類型
    開拓者: { circles:[[12, 12, 9]], paths:["M15.5 8.5l-2 5-5 2 2-5z"] },
    策略家: { paths:["M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z", "M9 12l2 2 4-4"] },
    追浪人: { paths:["M2 10c2.5 0 2.5-4 5-4s2.5 4 5 4 2.5-4 5-4 2.5 4 5 4", "M2 16c2.5 0 2.5-4 5-4s2.5 4 5 4 2.5-4 5-4 2.5 4 5 4"] },
    觀察家: { circles:[[11, 11, 7]], paths:["M21 21l-5-5"] },
    深耕者: { paths:["M12 21v-9", "M12 12c0-4 3-7 8-7 0 5-3 7-8 7z", "M12 14c0-3-2.5-5-7-5 0 4 2.5 5 7 5z"] },
    磐石: { paths:["M3 20l6-11 4 7 3-4 5 8z"] },
    取經人: { paths:["M4 12l5 5L20 6"] },
    守望者: { circles:[[12, 12, 3]], paths:["M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"] },
    // 三個面向
    u: { paths:["M3 12h4l3-8 4 16 3-8h4"] },
    r: { circles:[[12, 12, 9]], paths:["M12 3v3", "M12 18v3", "M3 12h3", "M18 12h3", "M12 12l3-3"] },
    m: { circles:[[12, 12, 9]], paths:["M12 6.5v11", "M15 9.5h-4a1.5 1.5 0 000 3h2a1.5 1.5 0 010 3H9"] },
    // 其他
    list: { paths:["M8 6h13", "M8 12h13", "M8 18h13", "M3.5 6h.01", "M3.5 12h.01", "M3.5 18h.01"] },
    clock: { circles:[[12, 12, 9]], paths:["M12 7v5l3 2"] },
    grid: { paths:["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"] },
    star: { paths:["M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.8l6.1-.9z"] },
    alert: { paths:["M12 3l10 18H2z", "M12 10v4", "M12 17h.01"] },
    bulb: { paths:["M9 18h6", "M10 21h4", "M12 3a6 6 0 00-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0012 3z"] },
    flag: { paths:["M5 21V4", "M5 4h11l-2 4 2 4H5"] },
    play: { paths:["M8 5l11 7-11 7z"] },
    // 學習地圖與教練的話
    shield: { paths:["M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"] },
    rewind: { paths:["M11 7l-6 5 6 5z", "M19 7l-6 5 6 5z"] },
    checklist: { paths:["M4 6l1.5 1.5L8 5", "M4 12l1.5 1.5L8 11", "M4 18l1.5 1.5L8 17", "M11 6h9", "M11 12h9", "M11 18h9"] },
    book: { paths:["M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z", "M4 21V5", "M8 7h7"] },
    folder: { paths:["M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1z"] },
    map: { paths:["M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z", "M9 4v14", "M15 6v14"] },
    mail: { paths:["M3 6h18v12H3z", "M3 7l9 6 9-6"] },
    target: { circles:[[12, 12, 9], [12, 12, 5]], paths:["M12 12h.01"] },
    quote: { paths:["M7 7h4v4c0 3-2 5-4 6", "M15 7h4v4c0 3-2 5-4 6"] },
    refresh: { paths:["M20 11a8 8 0 10-2 6", "M20 5v6h-6"] },
    chevron: { paths:["M9 6l6 6-6 6"] },
    lock: { paths:["M6 11h12v9H6z", "M8 11V8a4 4 0 018 0v3"] },
  };
  window.QUIZ_ICONS = ICONS;

  // 類型符文：三個面向各貢獻一筆，所以 8 型各不相同，也能從圖形讀出類型
  // bits = TYPE_KEY 的鍵，例如 "101"＝接受波動、借鑒他人、成長優先
  function sigil(bits) {
    const u = bits[0] === "1", r = bits[1] === "1", m = bits[2] === "1";
    const rune = [];
    // 做決定的依據：自己判斷＝一根主幹頂著一顆星點；借鑒他人＝兩根並行、各有節點
    if (r) { rune.push({ t:"path", d:"M50 24 V76" }); rune.push({ t:"dot", cx:50, cy:22, r:4.5 }); }
    else { rune.push({ t:"path", d:"M42 26 V76 M58 26 V76" }); rune.push({ t:"dot", cx:42, cy:24, r:3.5 }); rune.push({ t:"dot", cx:58, cy:24, r:3.5 }); }
    // 面對不確定性：接受波動＝穿過主幹的折線；追求穩定＝平直橫槓
    rune.push(u ? { t:"path", d:"M28 48 L38 38 L50 52 L62 38 L72 48" } : { t:"path", d:"M30 44 H70" });
    // 與錢的關係：成長優先＝向上尖角；保本優先＝托底的碗形
    rune.push(m ? { t:"path", d:"M32 72 L50 58 L68 72" } : { t:"path", d:"M32 60 V68 Q50 80 68 68 V60" });
    // 外圈刻痕：12 道，三個面向的位置加長
    const ticks = [];
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180, long = i % 4 === 0;
      const r1 = long ? 40 : 42.5, r2 = 46;
      ticks.push(`M${(50 + r1 * Math.cos(a)).toFixed(2)} ${(50 + r1 * Math.sin(a)).toFixed(2)} L${(50 + r2 * Math.cos(a)).toFixed(2)} ${(50 + r2 * Math.sin(a)).toFixed(2)}`);
    }
    return { rune, ticks:ticks.join(" ") };
  }
  // 每型的外框與專屬記號，讓相似的符文一眼分得開
  const SIGIL_STYLE = {
    開拓者:{ frame:"circle",  marks:["M80 12 V30", "M71 21 H89"] },
    追浪人:{ frame:"circle",  marks:["M10 58 q4 -7 8 0", "M82 58 q4 -7 8 0"] },
    觀察家:{ frame:"circle",  dots:[[20, 28, 2.6], [80, 28, 2.6], [50, 90, 2.6]] },
    策略家:{ frame:"hex",     marks:["M14 50 H22", "M78 50 H86"] },
    取經人:{ frame:"hex",     marks:["M38 88 H44", "M47 88 H53", "M56 88 H62"] },
    磐石:  { frame:"square",  marks:["M14 26 V14 H26", "M74 14 H86 V26", "M86 74 V86 H74", "M26 86 H14 V74"] },
    深耕者:{ frame:"diamond", marks:["M50 78 L43 88", "M50 78 L57 88", "M50 78 V90"] },
    守望者:{ frame:"arch",    marks:["M34 14 L28 7", "M50 10 V2", "M66 14 L72 7"] },
  };
  const FRAMES = {
    hex:"M50 3 L91 26.5 V73.5 L50 97 L9 73.5 V26.5 Z",
    square:"M20 6 H80 Q94 6 94 20 V80 Q94 94 80 94 H20 Q6 94 6 80 V20 Q6 6 20 6 Z",
    diamond:"M50 2 L98 50 L50 98 L2 50 Z",
    arch:"M8 94 V50 A42 42 0 0 1 92 50 V94 Z",
  };
  window.QUIZ_SIGIL = function (bits, name) {
    const base = sigil(bits), st = SIGIL_STYLE[name] || { frame:"circle" };
    return { ...base, frame:st.frame, framePath:FRAMES[st.frame] || null, marks:st.marks || [], markDots:st.dots || [] };
  };
})();
