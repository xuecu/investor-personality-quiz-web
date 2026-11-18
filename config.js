/* 投資者性格探索：部署設定（交付後各單位只需要改這個檔） */
window.QUIZ_CONFIG = {
  // Google Apps Script 部署後拿到的網址（結尾是 /exec），可以放好幾個，每一筆會同時送到每個網址。
  // 全部留空＝結果頁不顯示聯絡表單。設定步驟見 google-sheet-setup.md
  SUBMIT_URL: [
    "https://script.google.com/macros/s/AKfycbz-VlceDZ4QX2904aChz5PxRV0ZZPNbpmz09YPdcjRJtdwhkW_BPWrRDTRbZ5x0BDjTRQ/exec", // 主表 A：公司帳號
    "https://script.google.com/macros/s/AKfycbzkXMqFU2hAtpiPa0g9BtSAL1DcUexJJI9KLIpy9phNXxqX1fAQNA9j4L3Myb7z-sGlXA/exec", // 主表 B：另一個帳號
  ],

  // 測驗的正式網址（例如 "https://quiz.example.com/"）。填了之後，試算表的「結果網址」一律用它組成，
  // 不管作答者從哪裡打開測驗都點得開。網站真的上線、實際送一筆確認連結打得開，才填進來；
  // 留空＝用作答者當下打開的網址（從本機檔案打開時會是本機路徑，點不開）。
  // 注意：各單位自己部署時要改成自己的網址；改網址只影響之後的資料，已寫進試算表的舊連結不會跟著變。
  SITE_URL: "",

  // 開始作答前的填資料頁（按「開始測驗」後出現；SUBMIT_URL 全部留空時不出現，直接開始作答）
  START_FORM_TITLE: "開始之前，先留下你的聯絡方式",
  START_FORM_DESC: "做完測驗，完整的學習地圖和教練的信會直接打開；我們也會依你的結果，給你【實戰教學資源包＋下一階段學習行動指南】。",
  START_SUBMIT_LABEL: "開始作答",

  // 聯絡表單的文字（通用版，可依用途自行改寫）——結果頁底部那一張，給「直接打開結果連結、沒在開始前填過資料」的人用
  FORM_TITLE: "別讓測驗結果停在這，領取專屬於你的「理財升級攻略」",
  FORM_DESC: "留下聯絡方式，立即獲取符合你目前財務階段的【實戰教學資源包＋下一階段學習行動指南】，幫你避開常見投資陷阱！",
  CONSENT_TEXT: "我同意將上面填寫的聯絡資料與本次測驗結果，提供給本測驗的主辦單位，用於聯繫與提供相關資訊。我可以隨時要求查詢、更正或刪除。未滿 18 歲請在家長或監護人同意後再送出。",
  SUBMIT_LABEL: "取得專屬學習指南",
  THANKS_TEXT: "已收到，謝謝你！",
};
