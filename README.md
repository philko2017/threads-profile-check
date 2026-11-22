# Threads 首頁體檢器

給 Threads 新手（AI 小白）、在地小店與一人老闆用的免費工具。**不用登入 Threads、不用授權、不蒐集密碼**，直接在網頁裡 1:1 預覽手機個人主頁長相，避開「顯示名稱 14 天限改 2 次」的坑，並即時給出 5 大維度評分與 3 種風格改寫。

- **正式線上體驗**：https://philko2017.github.io/threads-profile-check/
- **實機電腦版截圖**：[desktop-preview.jpg](web/desktop-preview.jpg)（三欄工作台：左欄填寫與新手起稿／中欄 1:1 擬真手機預覽／右欄即時評分與 3 版改寫）
- **GitHub 專案**：https://github.com/philko2017/threads-profile-check
- **持續優化原則**：目前為 v1 公開版（電腦版體驗最完整，手機順手版 v1.1 排程中），未來每次功能優化與改版都會同步更新此網頁並發佈新貼文通知大家。

---

## 核心功能

1. **1:1 擬真 Threads 手機首頁預覽**
   - 支援深色 / 淺色雙主題切換。
   - 即時檢查顯示名稱 30 字、簡介 150 字、手機 3～5 行折行提醒、帳號字元規則，以及選填「置頂第一篇串文」視覺效果。
2. **新手友善「3 題快速起稿」**
   - 不必懂行銷術語，用白話回答「你是誰、能幫什麼忙、希望訪客下一步做什麼」，立即組出 3 版可直接套用的首頁草稿。
3. **五大維度即時評分 ＋ 3 種改寫提案**
   - 依 **定位清楚度 / 受眾與價值 / 資訊完整度 / 視覺易讀性 / 行動引導力** 給出 0–100 分，並支援 A / B 版本暫存與分數比較。
4. **體檢成績單 PNG 下載**
   - 一鍵輸出 `1080 × 1350` 高畫質體檢圖卡，方便直接發到 Threads 問脆友意見。
5. **免連線可獨立運作，也可選配 Gemini AI 深度診斷**
   - 預設以純前端規則引擎即時運作（GitHub Pages 免費靜態託管即可）；需要真實 AI 語意建議時，可匯入 `n8n/threads-profile-audit.json` 並把 Webhook 網址填進 `web/config.js`。

---

## 隱私與資安承諾

- **免登入／免 OAuth**：工具完全不要求連結 Threads 或 IG 帳號。
- **資料只留本機**：上傳預覽的大頭貼僅在瀏覽器 `FileReader` 讀取顯示，絕不上傳到任何伺服器；草稿只儲存在使用者的 `localStorage`。

---

## 本機啟動預覽

```bash
cd /Users/philko/Claude/LINE商務管理系統/20261122_Threads首頁體檢器
python3 -m http.server 8765 -d web
```

打開瀏覽器前往 `http://localhost:8765` 即可使用。

---

## 執行自動化測試

```bash
python3 n8n/build_flow.py
node tests/test_scorer.mjs
```

---

## 部署到 GitHub Pages 與啟用 AI 深度診斷（選配）

1. **公開靜態部署**：
   - 專案已附帶 `.github/workflows/pages.yml`，建立公開 GitHub Repo 並推送 `main` 分支，至 Repo `Settings -> Pages` 將 Source 改為 `GitHub Actions` 即可自動上線。
2. **開啟 Gemini AI 深度診斷（選配）**：
   - 執行 `python3 n8n/build_flow.py` 確認產出 `n8n/threads-profile-audit.json`。
   - 將該 JSON 匯入本機 n8n（保留現有 `Gemini API` Header Auth 憑證 `o1AnWSfmcx5uPMEz`）並啟用（Active）。
   - 將 `web/config.js` 的 `AI_AUDIT_WEBHOOK_URL` 改為你的公開 Webhook 網址（例如 `https://idly-junction-altitude.ngrok-free.dev/webhook/threads-profile-audit`）。
