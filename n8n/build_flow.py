"""產生 n8n 工作流程「Threads 首頁體檢器｜Gemini AI 深度診斷」。
執行：
    python3 n8n/build_flow.py
會在同目錄產出可匯入 n8n 的 threads-profile-audit.json。
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
GEMINI_CRED = {"httpHeaderAuth": {"id": "o1AnWSfmcx5uPMEz", "name": "Gemini API"}}
PRIMARY_MODEL = "gemini-3.5-flash-lite"
FALLBACK_MODEL = "gemini-3.1-flash-lite"

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "required": ["total", "grade", "badgeTitle", "summary", "dimensions", "suggestions", "rewrites"],
    "properties": {
        "total": {"type": "INTEGER"},
        "grade": {"type": "STRING"},
        "badgeTitle": {"type": "STRING"},
        "summary": {"type": "STRING"},
        "dimensions": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "required": ["key", "label", "score", "comment"],
                "properties": {
                    "key": {"type": "STRING"},
                    "label": {"type": "STRING"},
                    "score": {"type": "INTEGER"},
                    "comment": {"type": "STRING"},
                },
            },
        },
        "suggestions": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "required": ["priority", "title", "detail", "example"],
                "properties": {
                    "priority": {"type": "STRING"},
                    "title": {"type": "STRING"},
                    "detail": {"type": "STRING"},
                    "example": {"type": "STRING"},
                },
            },
        },
        "rewrites": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "required": ["style", "tag", "reason", "displayName", "bio"],
                "properties": {
                    "style": {"type": "STRING"},
                    "tag": {"type": "STRING"},
                    "reason": {"type": "STRING"},
                    "displayName": {"type": "STRING"},
                    "bio": {"type": "STRING"},
                },
            },
        },
    },
}

PREPARE_JS = r"""
const b = ($input.first().json.body) || {};
const R = (status, obj) => [{ json: { out: 0, status, res: JSON.stringify(obj) } }];

if (b.website_hp && String(b.website_hp).trim() !== '') {
  return R(400, { ok: false, error: 'rejected' });
}

const clean = (v, max) => String(v || '').replace(/\r\n/g, '\n').trim().slice(0, max);
const role = clean(b.role || 'creator', 24);
const displayName = clean(b.displayName, 60);
const handle = clean(b.handle, 50).replace(/^@+/, '');
const bio = clean(b.bio, 300);
const linkUrl = clean(b.linkUrl, 200);
const linkLabel = clean(b.linkLabel, 60);
const topics = Array.isArray(b.topics) ? b.topics.slice(0, 3).map((t) => clean(t, 24)).filter(Boolean) : [];
const pinnedPost = clean(b.pinnedPost, 400);

if (!displayName && !bio) {
  return R(400, { ok: false, error: 'empty' });
}

const roleMap = {
  personal: '個人生活／交朋友',
  freelancer: '一人接案／工作室',
  shop: '實體小店／網店老闆',
  creator: '知識分享／創作者',
  sidehustle: '上班族副業／斜槓經營',
};

const prompt = [
  '你是一位懂台灣 Threads 生態、說話白話親切、絕不講行銷黑話也絕不說教的顧問，正在幫「完全沒學過 AI 或行銷的初心者」體檢他的 Threads 個人首頁。',
  '',
  '請根據以下使用者填寫的首頁草稿進行評分與改寫：',
  `- 帳號方向：${roleMap[role] || role}`,
  `- 顯示名稱：${displayName || '（未填）'}`,
  `- 帳號 ID：${handle ? '@' + handle : '（未填）'}`,
  `- 個人簡介：\n${bio || '（未填）'}`,
  `- 外部連結：${linkUrl || '（無）'}${linkLabel ? '（文字：' + linkLabel + '）' : ''}`,
  `- 主題標籤：${topics.length ? topics.join('、') : '（未填）'}`,
  `- 置頂串文：${pinnedPost || '（無）'}`,
  '',
  '請嚴格遵守以下要求回傳 JSON：',
  '1. 使用台灣繁體中文，語氣鼓勵、直接講人話。',
  '2. dimensions 必須恰好有 5 項，每項滿分 20 分，key 與 label 固定為：',
  '   - clarity / 定位清楚度',
  '   - audienceValue / 受眾與價值',
  '   - completeness / 資訊完整度',
  '   - readability / 視覺易讀性',
  '   - cta / 行動引導力',
  '3. total 等於 5 項分數加總（0-100），grade 為 S (>=88)、A (>=75)、B (>=55)、C (<55)。',
  '4. suggestions 給 3～4 條具體優先修改建議，priority 只能用 high、medium 或 good，每條都要附可直接抄用的簡短 example。',
  '5. rewrites 必須給 3 個不同風格（例如：親切好聊版、專業秒懂版、記憶點亮眼版），且每一版：',
  '   - displayName 絕對不可超過 30 字元',
  '   - bio 絕對不可超過 145 字元（保留換行，排成 3～4 行，最後一行有明確但不壓迫的下一步行動）',
  '6. 提醒：Threads 名稱與帳號 14 天內改動次數有限、簡介裡的網址無法點擊，評點時可貼心順帶提醒。',
].join('\n');

return [{
  json: {
    out: 1,
    models: __MODELS__,
    gemini: {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: __SCHEMA__,
      },
    },
  },
}];
""".replace("__MODELS__", json.dumps([PRIMARY_MODEL, FALLBACK_MODEL])).replace(
    "__SCHEMA__", json.dumps(RESPONSE_SCHEMA, ensure_ascii=False)
)

PARSE_JS = r"""
const rawText = $input.first().json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
const trimLen = (s, max) => {
  const chars = Array.from(String(s || '').trim());
  while (chars.join('').length > max) chars.pop();
  return chars.join('').trim();
};

try {
  const parsed = JSON.parse(rawText);
  if (Array.isArray(parsed.rewrites)) {
    parsed.rewrites = parsed.rewrites.slice(0, 3).map((rw) => ({
      ...rw,
      displayName: trimLen(rw.displayName || '', 30),
      bio: trimLen(rw.bio || '', 150),
    }));
  }
  return [{ json: { ok: true, mode: 'ai', report: parsed } }];
} catch (err) {
  return [{ json: { ok: false, error: 'parse_failed' } }];
}
"""


def build_workflow():
    nodes = []
    conns = {}

    def add_node(name, typ, ver, params, x, y, **extra):
        nodes.append({
            "id": f"tpa-{len(nodes):03d}-0000-4000-8000-000000000000",
            "name": name,
            "type": typ,
            "typeVersion": ver,
            "position": [x, y],
            "parameters": params,
            **extra,
        })
        return name

    def link(src, dst, out=0):
        conns.setdefault(src, {"main": []})
        while len(conns[src]["main"]) <= out:
            conns[src]["main"].append([])
        conns[src]["main"][out].append({"node": dst, "type": "main", "index": 0})

    def respond(name, x, y, body_expr, status_expr="200"):
        return add_node(name, "n8n-nodes-base.respondToWebhook", 1.1, {
            "respondWith": "text",
            "responseBody": body_expr,
            "options": {
                "responseCode": int(status_expr) if str(status_expr).isdigit() else status_expr,
                "responseHeaders": {
                    "entries": [
                        {"name": "Content-Type", "value": "application/json; charset=utf-8"},
                        {"name": "Access-Control-Allow-Origin", "value": "*"},
                    ]
                },
            },
        }, x, y)

    def gemini_node(name, x, y, model_idx):
        return add_node(name, "n8n-nodes-base.httpRequest", 4.2, {
            "method": "POST",
            "url": f"=https://generativelanguage.googleapis.com/v1beta/models/{{{{ $('驗證與組裝 Prompt').first().json.models[{model_idx}] }}}}:generateContent",
            "authentication": "genericCredentialType",
            "genericAuthType": "httpHeaderAuth",
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify($('驗證與組裝 Prompt').first().json.gemini) }}",
            "options": {"timeout": 22000},
        }, x, y, credentials=GEMINI_CRED, onError="continueErrorOutput")

    add_node("體檢表單送入", "n8n-nodes-base.webhook", 2, {
        "httpMethod": "POST",
        "path": "threads-profile-audit",
        "responseMode": "responseNode",
        "options": {"allowedOrigins": "*"},
    }, 0, 200, webhookId="a91b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d")

    add_node("驗證與組裝 Prompt", "n8n-nodes-base.code", 2, {
        "mode": "runOnceForAllItems",
        "language": "javaScript",
        "jsCode": PREPARE_JS.strip(),
    }, 240, 200)

    add_node("分流", "n8n-nodes-base.switch", 3.2, {
        "mode": "expression",
        "numberOutputs": 2,
        "output": "={{ $json.out }}",
    }, 480, 200)

    respond("回傳檢查錯誤", 720, 40, "={{ $json.res }}", "={{ $json.status }}")
    gemini_node("Gemini 主診斷", 720, 260, 0)
    gemini_node("Gemini 備援診斷", 960, 400, 1)

    add_node("解析與整理結果", "n8n-nodes-base.code", 2, {
        "mode": "runOnceForAllItems",
        "language": "javaScript",
        "jsCode": PARSE_JS.strip(),
    }, 1200, 260)

    respond("回傳 AI 結果", 1440, 260, "={{ JSON.stringify($json) }}", "200")
    respond("回傳 AI 忙碌", 1200, 440, '{"ok":false,"error":"ai_busy"}', "503")

    link("體檢表單送入", "驗證與組裝 Prompt")
    link("驗證與組裝 Prompt", "分流")
    link("分流", "回傳檢查錯誤", 0)
    link("分流", "Gemini 主診斷", 1)
    link("Gemini 主診斷", "解析與整理結果", 0)
    link("Gemini 主診斷", "Gemini 備援診斷", 1)
    link("Gemini 備援診斷", "解析與整理結果", 0)
    link("Gemini 備援診斷", "回傳 AI 忙碌", 1)
    link("解析與整理結果", "回傳 AI 結果")

    return {
        "id": "threadsProfileAudit1",
        "name": "Threads 首頁體檢器｜AI 深度診斷與改寫",
        "active": False,
        "settings": {"executionOrder": "v1", "timezone": "Asia/Taipei"},
        "nodes": nodes,
        "connections": conns,
        "pinData": {},
    }


if __name__ == "__main__":
    wf = build_workflow()
    out_path = HERE / "threads-profile-audit.json"
    out_path.write_text(json.dumps(wf, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {out_path.name} with {len(wf['nodes'])} nodes")
