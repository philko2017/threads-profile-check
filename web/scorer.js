/* global module */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ThreadsProfileScorer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LIMITS = {
    displayNameMax: 30,
    handleMax: 30,
    bioMax: 150,
    bioIdealMin: 45,
    bioIdealMax: 135,
    bioLinesMin: 3,
    bioLinesMax: 5,
    topicsMax: 3,
    lineSoftMax: 32,
  };

  const ROLE_PRESETS = {
    personal: {
      id: 'personal',
      label: '個人生活／交朋友',
      hint: '讓人 3 秒知道你的生活重心、個性亮點，並有個好接話的話題',
      whoPlaceholder: '例如：台北上班族／下班愛煮宵夜的貓奴',
      valuePlaceholder: '例如：常分享 15 分鐘懶人料理跟台北巷弄咖啡廳',
      actionPlaceholder: '例如：歡迎推薦我台北好吃的乾麵或聊聊養貓日常',
      defaultTopics: ['日常觀察', '台北美食', '下班料理'],
    },
    freelancer: {
      id: 'freelancer',
      label: '一人接案／工作室',
      hint: '清楚寫出「幫誰解決什麼事」，讓有需求的人敢私訊或預約',
      whoPlaceholder: '例如：板橋一人寵物美容師／接案網頁設計師',
      valuePlaceholder: '例如：一對一不關籠洗剪，讓怕生的毛孩也能安心洗香香',
      actionPlaceholder: '例如：點下方看價目表與本週可預約時段',
      defaultTopics: ['一人工作室', '接案日常', '預約制'],
    },
    shop: {
      id: 'shop',
      label: '實體小店／網店老闆',
      hint: '一眼看懂「在哪裡、賣什麼招牌、怎麼買／怎麼預約」',
      whoPlaceholder: '例如：新北新莊巷弄手作早午餐小店',
      valuePlaceholder: '例如：每日現調古早味粉漿蛋餅，外酥內 Q 不油膩',
      actionPlaceholder: '例如：點下方看今日菜單與 Google 地圖導航',
      defaultTopics: ['在地小店', '早午餐', '職人手作'],
    },
    creator: {
      id: 'creator',
      label: '知識分享／創作者',
      hint: '讓第一次滑進來的人馬上懂「追蹤你會學到或拿到什麼」',
      whoPlaceholder: '例如：上班族三寶爸，專幫一人老闆把 AI 用進生意',
      valuePlaceholder: '例如：把複雜工具做成免費網頁／LINE 小工具，零基礎也能用',
      actionPlaceholder: '例如：先玩下面這個免費首頁體檢器，有問題直接留言問',
      defaultTopics: ['AI 實戰', '一人創業', '實用小工具'],
    },
    sidehustle: {
      id: 'sidehustle',
      label: '上班族副業／斜槓經營',
      hint: '寫出本業與下班在累積的具體事情，不喊口號更有真實感',
      whoPlaceholder: '例如：白天當工程師，下班幫在地小店寫自動化小工具',
      valuePlaceholder: '例如：實測省時省錢的營運技巧與接案踩雷筆記',
      actionPlaceholder: '例如：點擊免費體驗我們做好的小工具，歡迎交流',
      defaultTopics: ['下班實驗室', '副業筆記', 'AI 小工具'],
    },
  };

  const SAMPLE_PROFILES = {
    shop: {
      role: 'shop',
      displayName: '早安巷口｜新莊粉漿蛋餅小店',
      handle: 'alley.morning.tw',
      bio: '📍 新北新莊幸福路巷內｜手作古早味早午餐\n🥞 每日現調純米粉漿蛋餅＋自家熬煮紅茶，週二至週日 06:30 開賣\n👇 先看今日菜單與 Google 地圖導航（可先 LINE 預訂外帶）',
      linkUrl: 'https://maps.google.com',
      linkLabel: '今日菜單＆地圖導航',
      topics: ['新莊美食', '古早味蛋餅', '在地小店'],
      pinnedPost: '第一次來我們店裡不知道點什麼？直接點原味粉漿蛋餅＋半熟蛋配冰豆漿紅茶，週六建議先用連結預訂比較不用等喔！',
      hasCustomAvatar: true,
    },
    freelancer: {
      role: 'freelancer',
      displayName: '毛毛慢慢洗｜板橋一人寵物美容',
      handle: 'maomao.grooming',
      bio: '🐾 板橋江子翠一對一預約制，全程不關籠\n✂️ 專接容易緊張、高齡或第一次洗澡的狗狗貓貓\n👇 點下方看透明價目表與本月剩餘可約時段',
      linkUrl: 'https://line.me/R/ti/p/@demo',
      linkLabel: '價目表＆線上預約',
      topics: ['寵物美容', '不關籠', '板橋工作室'],
      pinnedPost: '很多主人問：膽小狗來洗澡會不會一直發抖？我們同一時段只接一隻，洗完不趕時間，也會傳今天的小短片給你看。',
      hasCustomAvatar: true,
    },
    creator: {
      role: 'creator',
      displayName: '三寶爸｜帶老闆用 AI 加速',
      handle: 'its.all.good.73',
      bio: '上班族三寶爸｜下班幫一人老闆把 AI 用進生意（客製 LINE 工具）\n不想只教指令，乾脆做成免登入就能直接用的免費工具\n👇 先用這個免費網頁預覽你的 Threads 首頁與 AI 體檢',
      linkUrl: 'https://philko2017.github.io/threads-food-map',
      linkLabel: 'Threads 首頁體檢器',
      topics: ['創業日記', '一人公司', 'AI 小工具'],
      pinnedPost: '整理了「不用寫程式也能拿來用」的小店營運免費工具合集，不知道從哪開始的老闆歡迎留言你的行業，我幫你看怎麼套用！',
      hasCustomAvatar: true,
    },
    personal: {
      role: 'personal',
      displayName: '阿哲的 15 分鐘下班廚房',
      handle: 'azhe.cooks.night',
      bio: '🍳 台北通勤族｜每天下班都在研究 15 分鐘上桌的懶人晚餐\n🐱 家有兩隻橘貓監工，偶爾記錄超商新品實測不踩雷\n💬 歡迎推薦你最拿手的救命家常菜，一起交換食譜！',
      linkUrl: '',
      linkLabel: '',
      topics: ['下班料理', '台北日常', '橘貓監工'],
      pinnedPost: '本週最滿意的是「蒜香醬油杏鮑菇蓋飯」，備料加炒不用 12 分鐘，洗一個鍋子就收工。大家下班累到爆都吃什麼？',
      hasCustomAvatar: true,
    },
  };

  const VAGUE_WORDS = ['斜槓', '熱愛生活', '佛系', '隨緣', '什麼都聊', '多多指教', '記錄生活', '努力變更好', '做自己'];
  const ROLE_ACTION_WORDS = ['免費', '點下方', '點這裡', '看菜單', '價目', '預約', '私訊', '留言', '領取', '逛逛', '體驗', '試用', '加入', '收藏', '收錄', '導航', '預訂', '聊聊', '交流', '推薦', '交換', '問我', '填表'];
  const ARROW_CUES = ['👇', '⬇️', '↓', '→', '🔗', '▲', '👉'];

  const CLARITY_CUES = ['是', '幫', '做', '寫', '開', '賣', '專注', '分享', '提供', '設計', '料理', '美容', '攝影', '老師', '老闆', '爸', '媽', '師', '店', '工作室', '小店', '接案', '上班族', '研究', '記錄'];

  const VALUE_CUES = {
    shop: ['巷', '區', '市', '縣', '路', '街', '手作', '每日', '現做', '現調', '內用', '外帶', '宅配', '開賣', '營業', '早午餐', '咖啡', '甜點', '蛋餅', '菜單', '預訂', '專賣', '限量'],
    freelancer: ['一對一', '預約', '不關籠', '幫', '協助', '專接', '專為', '客製', '到府', '價目', '省下', '解決', '緊張', '設計', '顧問', '接案', '時段', '透明', '工作室'],
    creator: ['免費', '免登入', '工具', '教學', '攻略', '實測', '清單', '地圖', '整理', '白話', '不藏私', 'AI', '小工具', '踩雷', '每週', '直接用', '懶人包', '體檢'],
    sidehustle: ['下班', '上班族', '兼職', '接單', '實測', '筆記', '省時', '小工具', '副業', '經驗', '踩雷', '免費', '真實', '累積', '零基礎'],
    personal: ['下班', '日常', '料理', '貓', '狗', '咖啡', '美食', '露營', '追劇', '通勤', '研究', '推薦', '不踩雷', '家常', '開箱', '散步', '書單'],
  };

  function strLen(s) {
    return String(s || '').length;
  }

  function cleanHandle(h) {
    return String(h || '').replace(/^@+/, '').trim();
  }

  function normalizeProfile(raw) {
    const p = raw || {};
    const role = ROLE_PRESETS[p.role] ? p.role : 'creator';
    const topics = Array.isArray(p.topics)
      ? p.topics.map((t) => String(t || '').trim()).filter(Boolean).slice(0, LIMITS.topicsMax)
      : [];
    return {
      role,
      displayName: String(p.displayName || '').trim(),
      handle: cleanHandle(p.handle),
      bio: String(p.bio || '').replace(/\r\n/g, '\n').trim(),
      linkUrl: String(p.linkUrl || '').trim(),
      linkLabel: String(p.linkLabel || '').trim(),
      topics,
      pinnedPost: String(p.pinnedPost || '').trim(),
      hasCustomAvatar: Boolean(p.hasCustomAvatar),
    };
  }

  function trimToLimit(text, max) {
    const s = String(text || '').trim();
    if (s.length <= max) return s;
    const chars = Array.from(s);
    while (chars.join('').length > max) {
      chars.pop();
    }
    return chars.join('').trim();
  }

  function countMatches(text, list) {
    let count = 0;
    for (let i = 0; i < list.length; i += 1) {
      if (text.includes(list[i])) count += 1;
    }
    return count;
  }

  function countEmojis(text) {
    const m = String(text || '').match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
    return m ? m.length : 0;
  }

  function isValidUrl(url) {
    if (!url) return false;
    const candidate = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/\S*)?$/.test(candidate);
  }

  function extractDomain(url) {
    if (!url) return '';
    return String(url).replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  }

  function dimStatus(score) {
    if (score >= 16) return 'good';
    if (score >= 10) return 'warn';
    return 'bad';
  }

  function evaluateClarity(p) {
    if (!p.displayName && !p.bio) {
      return { score: 0, comment: '還沒填寫名稱與簡介，路人點進來會完全看不出你是誰。' };
    }
    let score = 0;
    const hasSep = /[｜|／/・\-]/.test(p.displayName);
    const hasChineseCue = /[\u4e00-\u9fff]{2,}/.test(p.displayName);
    if (p.displayName) {
      score += 4;
      if (hasSep) score += 5;
      else if (hasChineseCue && strLen(p.displayName) >= 6) score += 3;
      if (strLen(p.displayName) <= LIMITS.displayNameMax) score += 1;
    }

    const lines = p.bio ? p.bio.split('\n').map((l) => l.trim()).filter(Boolean) : [];
    const firstLine = lines[0] || '';
    if (firstLine) {
      if (strLen(firstLine) <= 36) score += 4;
      else score += 2;
      const cueHits = countMatches(p.bio, CLARITY_CUES);
      score += Math.min(6, cueHits * 2);
    }

    const vagueHits = countMatches(p.bio, VAGUE_WORDS);
    const concreteSignals = countMatches(p.bio, VALUE_CUES[p.role] || []) + (hasSep ? 1 : 0);
    if (vagueHits > 0 && concreteSignals < 2) {
      score -= Math.min(6, vagueHits * 3);
    }
    score = Math.max(0, Math.min(20, score));

    let comment = '一句話就能看懂你是誰、在做什麼，第一印象很穩！';
    if (score < 10) comment = '名稱或簡介偏抽象，路人停 3 秒可能還是不知道你是做什麼的。';
    else if (score < 16) comment = '有寫出大方向，如果把「名稱｜定位」補齊，會讓人更快記住你。';

    return { score, comment };
  }

  function evaluateAudienceValue(p) {
    if (!p.bio) {
      return { score: 0, comment: '還沒寫簡介內容，沒辦法看出你能帶給脆友什麼價值或話題。' };
    }
    const roleCues = VALUE_CUES[p.role] || VALUE_CUES.creator;
    const matchedRoleCues = countMatches(p.bio, roleCues);
    const sharedValueCues = countMatches(p.bio, ['幫', '專為', '給', '免費', '每日', '一對一', '實測', '分享', '推薦', '不', '省', '客製', '解決', '歡迎']);
    const hasNumbers = /\d+/.test(p.bio);
    const hasDetail = strLen(p.bio) >= 35;

    let score = 0;
    score += Math.min(10, matchedRoleCues * 3);
    score += Math.min(6, sharedValueCues * 2);
    if (hasNumbers) score += 2;
    if (hasDetail) score += 2;
    if (p.role === 'personal' && p.topics.length >= 2) score += 2;

    score = Math.max(0, Math.min(20, score));

    let comment = '受眾對象與提供的好處非常具體，路人一看就知道為何要追蹤你。';
    if (score < 10) comment = '缺少「能幫誰、提供什麼好處或特色」，看完容易滑走沒印象。';
    else if (score < 16) comment = '有提到你在做的事，再多補 1 個具體數字、地區或招牌特色會更有感。';

    return { score, comment };
  }

  function evaluateCompleteness(p, metrics) {
    if (!p.displayName && !p.handle && !p.bio && !p.linkUrl && metrics.topicsCount === 0) {
      return { score: 0, comment: '所有欄位都還是空的，從左側填寫或直接點一個範例試試看！' };
    }
    let score = 0;
    if (p.displayName) {
      score += strLen(p.displayName) <= LIMITS.displayNameMax ? 4 : 2;
    }
    if (metrics.handleValid) score += 3;
    else if (p.handle) score += 1;

    if (metrics.bioLen >= LIMITS.bioIdealMin && metrics.bioLen <= LIMITS.bioIdealMax) score += 6;
    else if ((metrics.bioLen >= 25 && metrics.bioLen < LIMITS.bioIdealMin) || (metrics.bioLen > LIMITS.bioIdealMax && metrics.bioLen <= LIMITS.bioMax)) score += 4;
    else if (metrics.bioLen > LIMITS.bioMax || metrics.bioLen >= 10) score += 2;

    if (isValidUrl(p.linkUrl)) score += 3;
    else if (p.role === 'personal' && metrics.topicsCount >= 2) score += 2;

    if (metrics.topicsCount >= 2) score += 3;
    else if (metrics.topicsCount === 1) score += 2;

    if (p.hasCustomAvatar) score += 1;
    if (p.pinnedPost && strLen(p.pinnedPost) >= 12) score += 1;

    score = Math.max(0, Math.min(20, score));

    let comment = '基本資料、連結、標籤都配得很齊全，版面信任度很高。';
    if (score < 10) comment = '資料欄位還缺少不少細節，先把名稱、簡介、標籤補齊分數會跳很快。';
    else if (score < 16) comment = '主要欄位都有了，可以檢查看看外部連結、主題標籤或字數甜區（45–135 字）。';

    return { score, comment };
  }

  function evaluateReadability(p, metrics) {
    if (!p.bio) {
      return { score: 0, comment: '填寫簡介後，這裡會幫你檢查手機上的換行與好讀程度。' };
    }
    const lines = p.bio.split('\n').map((l) => l.trim()).filter(Boolean);
    const maxLineLen = lines.reduce((m, l) => Math.max(m, strLen(l)), 0);
    const emojis = countEmojis(p.bio);

    let score = 0;
    if (metrics.bioLines >= LIMITS.bioLinesMin && metrics.bioLines <= LIMITS.bioLinesMax) score += 9;
    else if (metrics.bioLines === 2) score += 5;
    else if (metrics.bioLines === 6 || metrics.bioLines === 7) score += 5;
    else if (metrics.bioLines === 1) score += metrics.bioLen <= 28 ? 3 : 1;
    else score += 2;

    if (maxLineLen <= 34) score += 5;
    else if (maxLineLen <= 48) score += 3;

    if (emojis >= 1 && emojis <= 6) score += 4;
    else if (emojis === 0) score += 2;
    else if (emojis <= 10) score += 2;

    if (metrics.bioLen <= LIMITS.bioMax) score += 2;

    score = Math.max(0, Math.min(20, score));

    let comment = '三行左右的分段搭配適量圖示，在手機螢幕上掃視起來超輕鬆！';
    if (score < 10) comment = '文字都擠在一起或行數太多，手機滑過去看會覺得密密麻麻。';
    else if (score < 16) comment = '大致好讀，若把簡介分成「定位／亮點／下一步」3～4 行會更清爽。';

    return { score, comment };
  }

  function evaluateCta(p) {
    if (!p.bio && !p.linkUrl) {
      return { score: 0, comment: '還沒設計「讓訪客接下來做什麼」的引導。' };
    }
    const combined = `${p.bio}\n${p.linkLabel}`;
    const hasArrow = countMatches(combined, ARROW_CUES) > 0;
    const actionHits = countMatches(combined, ROLE_ACTION_WORDS);
    const hasQuestion = /[?？!]/.test(p.bio) || countMatches(p.bio, ['歡迎', '一起', '告訴我', '留言']) > 0;
    const lines = p.bio ? p.bio.split('\n').map((l) => l.trim()).filter(Boolean) : [];
    const lastLine = lines[lines.length - 1] || '';
    const lastLineInvite = countMatches(lastLine, ARROW_CUES.concat(ROLE_ACTION_WORDS).concat(['歡迎', '一起', '聊聊'])) > 0;

    let score = 0;
    if (hasArrow) score += 6;
    if (actionHits > 0) score += Math.min(8, 5 + actionHits);
    if (p.role === 'personal' && hasQuestion) score += 6;
    if (isValidUrl(p.linkUrl) && (hasArrow || actionHits > 0)) score += 3;
    else if (p.role === 'personal' && p.pinnedPost) score += 3;
    if (lastLineInvite) score += 3;

    score = Math.max(0, Math.min(20, score));

    let comment = '最後一句直接給出明確又沒壓力的下一步，路人看懂就會點下去！';
    if (score < 10) comment = '介紹完之後缺少「下一步邀請」，別人看完通常點讚就走、不會點連結或追蹤。';
    else if (score < 16) comment = '已有行動概念，最後一行加上「👇」明確說出點了會得到什麼，轉換更好。';

    return { score, comment };
  }

  function buildWarnings(p, metrics) {
    const warnings = [];
    if (metrics.nameLen > LIMITS.displayNameMax) {
      warnings.push({
        level: 'danger',
        text: `顯示名稱目前 ${metrics.nameLen} 字，已超過 Threads 上限 ${LIMITS.displayNameMax} 字（改名後 14 天內最多只能改 2 次）。`,
      });
    }
    if (p.handle && !metrics.handleValid) {
      warnings.push({
        level: 'danger',
        text: '帳號 ID 僅能使用英文字母、數字、底線 (_) 與句點 (.)，且不可超過 30 字元。',
      });
    }
    if (metrics.bioLen > LIMITS.bioMax) {
      warnings.push({
        level: 'danger',
        text: `個人簡介目前 ${metrics.bioLen} 字，已超過 Threads ${LIMITS.bioMax} 字上限，送出時會被截斷。`,
      });
    }
    if (metrics.bioLines > LIMITS.bioLinesMax) {
      warnings.push({
        level: 'warn',
        text: `簡介共有 ${metrics.bioLines} 行，在部分小螢幕手機上可能被收折或顯得擁擠，建議收斂在 3～5 行。`,
      });
    }
    if (metrics.topicsCount === 0) {
      warnings.push({
        level: 'info',
        text: 'Threads 支援在個人頁放 1～3 個「主題標籤」，可幫演算法與訪客更快分類你。',
      });
    }
    return warnings;
  }

  function buildSuggestions(p, dims, metrics) {
    const list = [];
    const dimMap = {};
    dims.forEach((d) => { dimMap[d.key] = d; });

    if (metrics.nameLen === 0 || !/[｜|／/・\-]/.test(p.displayName)) {
      list.push({
        priority: dimMap.clarity.score < 12 ? 'high' : 'medium',
        title: '用「暱稱｜一句話定位」升級顯示名稱',
        detail: '顯示名稱 14 天內最多只能改 2 次，建議先在這裡試好再回 App 改。讓別人滑過留言區只看名稱就懂你做什麼。',
        example: '例如：「小安｜板橋寵物美容」或「阿哲｜下班寫 AI 小工具」',
      });
    }

    if (metrics.bioLen < 30 || dimMap.readability.score < 13) {
      list.push({
        priority: 'high',
        title: '把簡介排成好讀的「三行黃金格式」',
        detail: '第 1 行寫你是誰，第 2 行寫你能幫什麼忙或特色是什麼，第 3 行寫一個輕鬆的下一步（全篇控制在 45～135 字最剛好）。',
        example: '身分定位\n具體特色或能幫上的忙\n👇 下一步引導',
      });
    }

    if (dimMap.audienceValue.score < 14) {
      list.push({
        priority: 'high',
        title: '少一點形容詞，多放 1 個具體關鍵字',
        detail: '像「熱愛生活」「佛系斜槓」很容易被滑過。試著補上地區、品項、服務對象或數字（例如：15 分鐘、一對一、免費）。',
        example: p.role === 'shop' ? '📍 新北新莊｜每日現調純米粉漿蛋餅' : '幫一人小店做免寫程式就能直接用的 LINE 工具',
      });
    }

    if (dimMap.cta.score < 14) {
      list.push({
        priority: dimMap.cta.score < 10 ? 'high' : 'medium',
        title: '最後一行加上無壓力的行動引導 (CTA)',
        detail: '不要只寫「歡迎追蹤」或留一個沒說明的網址。告訴訪客「點下去有什麼好康」或給一個好接話的問題。',
        example: p.role === 'personal' ? '💬 歡迎推薦你的口袋宵夜給我！' : '👇 點下方看今日菜單與免費試用小工具',
      });
    }

    if (!isValidUrl(p.linkUrl) && p.role !== 'personal') {
      list.push({
        priority: 'medium',
        title: '善用 Threads 唯一一個外部連結欄位',
        detail: 'Threads 簡介裡的網址不能直接點，只有專屬「連結」欄可以點開。建議放你的免費工具頁、LINE 官方帳號、菜單或地圖導航。',
        example: 'https://你的專屬頁面網址',
      });
    }

    if (list.length === 0) {
      list.push({
        priority: 'good',
        title: '你的首頁結構已經非常清楚！',
        detail: '下一步建議把這個版本「存成版本 A」，再從右下方挑 1 個改寫風格試排「版本 B」，下載體檢成績單貼到 Threads 問脆友哪版更好懂。',
        example: '提示：多發 1 篇「置頂自我介紹／工具合集」，進來的人停留率會更高。',
      });
    }

    return list.slice(0, 4);
  }

  function scoreProfile(rawProfile) {
    const p = normalizeProfile(rawProfile);
    const lines = p.bio ? p.bio.split('\n').map((l) => l.trim()).filter(Boolean) : [];
    const metrics = {
      nameLen: strLen(p.displayName),
      handleLen: strLen(p.handle),
      handleValid: /^[a-zA-Z0-9._]{1,30}$/.test(p.handle),
      bioLen: strLen(p.bio),
      bioLines: lines.length,
      topicsCount: p.topics.length,
    };

    const clarity = evaluateClarity(p);
    const audienceValue = evaluateAudienceValue(p);
    const completeness = evaluateCompleteness(p, metrics);
    const readability = evaluateReadability(p, metrics);
    const cta = evaluateCta(p);

    const dimensions = [
      { key: 'clarity', label: '定位清楚度', max: 20, score: clarity.score, status: dimStatus(clarity.score), comment: clarity.comment },
      { key: 'audienceValue', label: '受眾與價值', max: 20, score: audienceValue.score, status: dimStatus(audienceValue.score), comment: audienceValue.comment },
      { key: 'completeness', label: '資訊完整度', max: 20, score: completeness.score, status: dimStatus(completeness.score), comment: completeness.comment },
      { key: 'readability', label: '視覺易讀性', max: 20, score: readability.score, status: dimStatus(readability.score), comment: readability.comment },
      { key: 'cta', label: '行動引導力', max: 20, score: cta.score, status: dimStatus(cta.score), comment: cta.comment },
    ];

    const total = dimensions.reduce((sum, d) => sum + d.score, 0);

    let grade = 'C';
    let badgeTitle = '路人容易滑走的神秘首頁';
    let summary = '目前資訊還太少或偏模糊，只要照著右邊建議補齊三行格式，分數馬上能衝上 80 分！';
    if (total >= 88) {
      grade = 'S';
      badgeTitle = '3 秒秒懂王・超容易被追蹤';
      summary = '清楚、有溫度又知道下一步要點哪裡！這組版面已經可以直接安心拿到 Threads 上用了。';
    } else if (total >= 75) {
      grade = 'A';
      badgeTitle = '很有吸引力的好懂首頁';
      summary = '大方向很清楚，只差 1～2 個細節微調，就能讓陌生訪客更願意停留或點擊連結。';
    } else if (total >= 55) {
      grade = 'B';
      badgeTitle = '差一點就讓人想追蹤';
      summary = '看得出你想分享什麼，但排版或「給別人的好處／行動引導」還可以再講白話一點。';
    }

    return {
      mode: 'local',
      total,
      grade,
      badgeTitle,
      summary,
      dimensions,
      warnings: buildWarnings(p, metrics),
      suggestions: buildSuggestions(p, dimensions, metrics),
      metrics,
      normalized: p,
    };
  }

  function extractBaseName(displayName) {
    const clean = String(displayName || '').trim();
    if (!clean) return '小老闆實驗室';
    const firstPart = clean.split(/[｜|／/・\-]/)[0].trim();
    return trimToLimit(firstPart || clean, 12);
  }

  function formatBoundedBio(lines) {
    const cleanLines = lines.map((l) => String(l || '').trim()).filter(Boolean);
    let result = cleanLines.join('\n');
    if (result.length <= LIMITS.bioMax) return result;
    const trimmed = cleanLines.map((l, idx) => trimToLimit(l, idx === 1 ? 56 : 44));
    result = trimmed.join('\n');
    return trimToLimit(result, LIMITS.bioMax);
  }

  function makeRoleCopy(p) {
    const preset = ROLE_PRESETS[p.role] || ROLE_PRESETS.creator;
    const baseName = extractBaseName(p.displayName);
    const rawLines = p.bio ? p.bio.split('\n').map((l) => l.trim()).filter(Boolean) : [];
    const whoText = rawLines[0] || preset.whoPlaceholder.replace(/^例如：/, '');
    const valueText = rawLines[1] || preset.valuePlaceholder.replace(/^例如：/, '');
    const actionText = rawLines[2] || preset.actionPlaceholder.replace(/^例如：/, '');
    const topics = p.topics.length ? p.topics : preset.defaultTopics.slice(0, 3);
    return { preset, baseName, whoText, valueText, actionText, topics };
  }

  function generateLocalRewrites(rawProfile) {
    const p = normalizeProfile(rawProfile);
    const { baseName, whoText, valueText, actionText, topics } = makeRoleCopy(p);
    const hasUrl = Boolean(p.linkUrl);

    const nameFriendly = trimToLimit(`${baseName}｜好懂日常版`, LIMITS.displayNameMax);
    const namePro = trimToLimit(
      /[｜|／/]/.test(p.displayName) ? p.displayName : `${baseName}｜${p.role === 'shop' ? '在地好店' : p.role === 'freelancer' ? '預約制工作室' : '實戰筆記'}`,
      LIMITS.displayNameMax
    );
    const nameHook = trimToLimit(`${baseName}｜講真話不說教`, LIMITS.displayNameMax);

    const ctaLineFriendly = hasUrl
      ? `👇 點下方連結來看看：${trimToLimit(actionText.replace(/^[👇💬✨📍🐾✂️🍳]+\s*/, ''), 34)}`
      : `💬 ${trimToLimit(actionText.replace(/^[👇💬✨📍🐾✂️🍳]+\s*/, ''), 36)}`;

    const ctaLinePro = hasUrl
      ? `👇 ${trimToLimit(actionText.replace(/^[👇💬✨📍🐾✂️🍳]+\s*/, ''), 38)}`
      : `👇 歡迎留言或私訊，告訴我你現在最想解決的問題`;

    const ctaLineHook = hasUrl
      ? `👇 不講大道理，先體驗下面免費工具／資訊再說`
      : `💬 看完有共鳴的話，留一句你的想法一起聊！`;

    return [
      {
        style: '親切好聊版',
        tag: '拉近距離・像真人聊天',
        reason: '把距離感拿掉，用白話口吻說出你是誰，特別適合脆友滑到留言區點進來認識你。',
        displayName: nameFriendly,
        bio: formatBoundedBio([
          `嗨我是 ${baseName}，${trimToLimit(whoText, 34)}`,
          `✨ 平常專心做好這件事：${trimToLimit(valueText, 36)}`,
          ctaLineFriendly,
        ]),
        topics,
      },
      {
        style: '專業秒懂版',
        tag: '高轉換・3 秒對焦價值',
        reason: '嚴格套用「定位／能提供的價值／下一步引導」三行格式，陌生訪客一眼就明白為何要追蹤。',
        displayName: namePro,
        bio: formatBoundedBio([
          `📍 ${trimToLimit(whoText, 40)}`,
          `✅ ${trimToLimit(valueText, 42)}`,
          ctaLinePro,
        ]),
        topics,
      },
      {
        style: '記憶點亮眼版',
        tag: '有態度・讓人想留步',
        reason: '先講一個反差或堅持點建立記憶點，再把具體價值端出來，避免和別人長得一模一樣。',
        displayName: nameHook,
        bio: formatBoundedBio([
          `${trimToLimit(whoText, 38)}｜不說空話只留乾貨`,
          `🔥 專注把這件事做到位：${trimToLimit(valueText, 36)}`,
          ctaLineHook,
        ]),
        topics,
      },
    ];
  }

  function buildFromWizard(rawInput) {
    const input = rawInput || {};
    const role = ROLE_PRESETS[input.role] ? input.role : 'creator';
    const preset = ROLE_PRESETS[role];
    const who = String(input.who || '').trim() || preset.whoPlaceholder.replace(/^例如：/, '');
    const value = String(input.value || '').trim() || preset.valuePlaceholder.replace(/^例如：/, '');
    const action = String(input.action || '').trim() || preset.actionPlaceholder.replace(/^例如：/, '');
    const linkUrl = String(input.linkUrl || '').trim();
    const displayBase = extractBaseName(input.displayName || who);

    const synthetic = {
      role,
      displayName: displayBase,
      handle: input.handle || '',
      bio: `${who}\n${value}\n👇 ${action}`,
      linkUrl,
      topics: preset.defaultTopics.slice(0, 3),
    };

    return generateLocalRewrites(synthetic).map((draft) => ({
      ...draft,
      linkUrl,
      handle: cleanHandle(input.handle || ''),
    }));
  }

  return {
    LIMITS,
    ROLE_PRESETS,
    SAMPLE_PROFILES,
    normalizeProfile,
    trimToLimit,
    isValidUrl,
    extractDomain,
    scoreProfile,
    generateLocalRewrites,
    buildFromWizard,
  };
});
