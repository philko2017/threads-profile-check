// Threads 首頁體檢器設定檔
// 若想開啟真實 Gemini AI 深度診斷與量身改寫：
// 1. 先匯入專案中的 n8n/threads-profile-audit.json 並開啟（Active）
// 2. 將下方 AI_AUDIT_WEBHOOK_URL 填入你的 Webhook 網址（例如：https://idly-junction-altitude.ngrok-free.dev/webhook/threads-profile-audit）
// 若留空或暫時離線，網頁會自動使用純前端即時體檢引擎與 3 版改寫範本，完全不中斷使用。
window.THREADS_AUDIT_CONFIG = {
  AI_AUDIT_WEBHOOK_URL: '',
  ADMIN_THREADS_HANDLE: 'its.all.good.73',
  ADMIN_BRAND_NAME: '三寶爸｜帶老闆用 AI 加速',
  SITE_TITLE: 'Threads 首頁體檢器',
  SITE_URL: 'https://philko2017.github.io/threads-profile-check/',
  AI_COOLDOWN_MS: 10000,
};
