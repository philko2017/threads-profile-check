(function (root) {
  'use strict';

  const S = root.ThreadsProfileScorer;
  const Card = root.ThreadsAuditCard;
  const CFG = root.THREADS_AUDIT_CONFIG || {};
  const STORAGE_KEY = 'threads_audit_draft_v1';
  const AB_STORAGE_KEY = 'threads_audit_ab_v1';
  const ALLOWED_AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
  const RING_CIRCUMFERENCE = 2 * Math.PI * 50;

  const $ = (id) => document.getElementById(id);

  let state = {
    role: 'creator',
    displayName: S.SAMPLE_PROFILES.creator.displayName,
    handle: S.SAMPLE_PROFILES.creator.handle,
    bio: S.SAMPLE_PROFILES.creator.bio,
    linkUrl: S.SAMPLE_PROFILES.creator.linkUrl,
    linkLabel: S.SAMPLE_PROFILES.creator.linkLabel,
    topics: S.SAMPLE_PROFILES.creator.topics.slice(),
    pinnedPost: S.SAMPLE_PROFILES.creator.pinnedPost,
    hasCustomAvatar: false,
    avatarDataUrl: '',
    avatarColor: '#ea580c',
  };

  let previewTheme = 'dark';
  let abStore = { A: null, B: null };
  let undoSnapshot = null;
  let aiReportOverride = null;
  let lastAiCallAt = 0;
  let toastTimer = null;

  function showToast(msg) {
    const el = $('toast-banner');
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function loadStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          state = {
            ...state,
            role: S.ROLE_PRESETS[parsed.role] ? parsed.role : state.role,
            displayName: String(parsed.displayName || ''),
            handle: String(parsed.handle || ''),
            bio: String(parsed.bio || ''),
            linkUrl: String(parsed.linkUrl || ''),
            linkLabel: String(parsed.linkLabel || ''),
            topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, S.LIMITS.topicsMax) : [],
            pinnedPost: String(parsed.pinnedPost || ''),
            avatarColor: String(parsed.avatarColor || '#ea580c'),
            avatarDataUrl: typeof parsed.avatarDataUrl === 'string' && parsed.avatarDataUrl.startsWith('data:image/') ? parsed.avatarDataUrl : '',
            hasCustomAvatar: Boolean(parsed.avatarDataUrl),
          };
        }
      }
      const savedAb = localStorage.getItem(AB_STORAGE_KEY);
      if (savedAb) {
        const parsedAb = JSON.parse(savedAb);
        if (parsedAb && typeof parsedAb === 'object') {
          abStore = { A: parsedAb.A || null, B: parsedAb.B || null };
        }
      }
    } catch (_) {
      // Ignore storage errors in private browsing mode
    }
  }

  function saveStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // Ignore quota errors (e.g., large avatar data URL)
    }
  }

  function saveAbStorage() {
    try {
      localStorage.setItem(AB_STORAGE_KEY, JSON.stringify(abStore));
    } catch (_) {
      // Ignore storage quota errors
    }
  }

  function syncInputsFromState() {
    $('field-role').value = state.role;
    $('wiz-role').value = state.role;
    $('field-name').value = state.displayName;
    $('field-handle').value = state.handle;
    $('field-bio').value = state.bio;
    $('field-link').value = state.linkUrl;
    $('field-link-label').value = state.linkLabel;
    $('field-pinned').value = state.pinnedPost;

    document.querySelectorAll('.avatar-preset-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.preset === state.avatarColor);
    });
  }

  function renderAvatar() {
    const initial = Array.from(state.displayName.trim() || state.handle.trim() || '脆')[0] || '脆';
    const thumb = $('avatar-thumb-preview');
    const prevImg = $('prev-avatar-img');
    const prevFallback = $('prev-avatar-fallback');

    if (state.avatarDataUrl) {
      thumb.style.backgroundImage = `url("${state.avatarDataUrl}")`;
      thumb.textContent = '';
      prevImg.src = state.avatarDataUrl;
      prevImg.classList.remove('hidden');
      prevFallback.classList.add('hidden');
    } else {
      thumb.style.backgroundImage = '';
      thumb.style.backgroundColor = state.avatarColor;
      thumb.textContent = initial;
      prevImg.removeAttribute('src');
      prevImg.classList.add('hidden');
      prevFallback.classList.remove('hidden');
      prevFallback.style.backgroundColor = state.avatarColor;
      prevFallback.textContent = initial;
    }
  }

  function renderTopicsEditor() {
    const list = $('topics-list');
    clearChildren(list);
    state.topics.forEach((topic, idx) => {
      const pill = el('span', 'topic-edit-pill');
      pill.appendChild(el('span', '', topic));
      const rmBtn = el('button', 'topic-remove-btn', '×');
      rmBtn.type = 'button';
      rmBtn.setAttribute('aria-label', `移除 ${topic}`);
      rmBtn.addEventListener('click', () => {
        state.topics.splice(idx, 1);
        onProfileChanged();
      });
      pill.appendChild(rmBtn);
      list.appendChild(pill);
    });

    const suggestWrap = $('topic-suggestions');
    clearChildren(suggestWrap);
    const preset = S.ROLE_PRESETS[state.role] || S.ROLE_PRESETS.creator;
    preset.defaultTopics.forEach((tag) => {
      if (state.topics.includes(tag)) return;
      const btn = el('button', 'topic-suggest-btn', `+ ${tag}`);
      btn.type = 'button';
      btn.addEventListener('click', () => addTopic(tag));
      suggestWrap.appendChild(btn);
    });
  }

  function renderPreview(report) {
    const m = report.metrics;
    const cleanHandle = state.handle.replace(/^@+/, '').trim() || 'your_handle';
    const displayName = state.displayName.trim() || '（尚未填寫顯示名稱）';

    $('prev-header-handle').textContent = cleanHandle;
    $('prev-display-name').textContent = displayName;
    $('prev-handle').textContent = `@${cleanHandle}`;
    $('prev-bio').textContent = state.bio.trim() || '這裡會即時呈現你的 Threads 個人簡介排版。建議寫成三行：你是誰、能幫上什麼忙、下一步動作。';

    const noteEl = $('prev-bio-limit-note');
    if (m.bioLen > S.LIMITS.bioMax) {
      noteEl.textContent = `⚠️ 已超過 ${S.LIMITS.bioMax} 字上限（目前 ${m.bioLen} 字），App 儲存時會截斷。`;
      noteEl.classList.remove('hidden');
    } else if (m.bioLines > S.LIMITS.bioLinesMax) {
      noteEl.textContent = `⚠️ 目前有 ${m.bioLines} 行，在小螢幕手機上可能需要「顯示更多」才看得到最後一行。`;
      noteEl.classList.remove('hidden');
    } else {
      noteEl.classList.add('hidden');
    }

    const domain = S.extractDomain(state.linkUrl);
    const linkEl = $('prev-link-domain');
    if (domain) {
      linkEl.textContent = state.linkLabel.trim() ? `${state.linkLabel.trim()} (${domain})` : domain;
      linkEl.classList.add('threads-shell-link-active');
    } else {
      linkEl.textContent = '尚未設定外部連結';
      linkEl.classList.remove('threads-shell-link-active');
    }

    const topicsRow = $('prev-topics-row');
    clearChildren(topicsRow);
    state.topics.forEach((t) => {
      topicsRow.appendChild(el('span', 'threads-topic-pill', t));
    });

    const pinnedCard = $('prev-pinned-card');
    if (state.pinnedPost.trim()) {
      pinnedCard.classList.remove('hidden');
      $('prev-pinned-author').textContent = state.displayName.trim().split(/[｜|]/)[0] || cleanHandle;
      $('prev-pinned-handle').textContent = `@${cleanHandle}`;
      $('prev-pinned-body').textContent = state.pinnedPost.trim();
    } else {
      pinnedCard.classList.add('hidden');
    }

    const pill = $('preview-rule-pill');
    const overRule = m.nameLen > S.LIMITS.displayNameMax || m.bioLen > S.LIMITS.bioMax || (state.handle.trim() && !m.handleValid);
    pill.textContent = overRule ? '⚠️ 有欄位超過規定' : '✓ 字數符合規定';
    pill.className = `rule-pill ${overRule ? 'rule-bad' : 'rule-ok'}`;
  }

  function renderCounters(report) {
    const m = report.metrics;
    const preset = S.ROLE_PRESETS[state.role] || S.ROLE_PRESETS.creator;
    $('role-hint').textContent = preset.hint;

    const nameCnt = $('count-name');
    nameCnt.textContent = `${m.nameLen} / ${S.LIMITS.displayNameMax}`;
    nameCnt.classList.toggle('is-over', m.nameLen > S.LIMITS.displayNameMax);

    const handleCnt = $('count-handle');
    handleCnt.textContent = `${m.handleLen} / ${S.LIMITS.handleMax}`;
    handleCnt.classList.toggle('is-over', m.handleLen > S.LIMITS.handleMax);

    $('handle-warn').classList.toggle('hidden', !state.handle.trim() || m.handleValid);

    const bioCnt = $('count-bio');
    bioCnt.textContent = `${m.bioLen} / ${S.LIMITS.bioMax}・${m.bioLines} 行`;
    bioCnt.classList.toggle('is-over', m.bioLen > S.LIMITS.bioMax);
  }

  function createRewriteCard(item, showApplyLabel) {
    const card = el('div', 'rewrite-card');
    const top = el('div', 'rewrite-top');
    top.appendChild(el('span', 'rewrite-style', item.style || '建議版本'));
    if (item.tag) top.appendChild(el('span', 'rewrite-tag', item.tag));
    card.appendChild(top);

    if (item.reason) card.appendChild(el('p', 'rewrite-reason', item.reason));

    const box = el('div', 'rewrite-preview-box');
    box.appendChild(el('div', 'rewrite-name', item.displayName));
    box.appendChild(el('div', 'rewrite-bio', item.bio));
    card.appendChild(box);

    const actions = el('div', 'rewrite-actions');
    const copyBtn = el('button', 'btn-ghost-sm', '複製簡介');
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', () => copyText(item.bio, '已複製這版簡介！'));

    const applyBtn = el('button', 'btn-outline-sm', showApplyLabel || '套用到預覽');
    applyBtn.type = 'button';
    applyBtn.addEventListener('click', () => applyRewrite(item));

    actions.appendChild(copyBtn);
    actions.appendChild(applyBtn);
    card.appendChild(actions);
    return card;
  }

  function renderAudit(report) {
    const total = Math.max(0, Math.min(100, Number(report.total) || 0));
    $('score-total-num').textContent = String(total);
    $('mobile-score-pill').textContent = `${total} 分`;
    if ($('mobile-live-score')) {
      $('mobile-live-score').textContent = `${total} 分・等級 ${report.grade || 'B'}`;
    }
    if ($('mobile-live-meta')) {
      const bioLines = String(state.bio || '').split(/\r?\n/).filter((l) => l.trim()).length;
      const nameLen = String(state.displayName || '').trim().length;
      const bioLen = String(state.bio || '').trim().length;
      const ruleOk = nameLen <= 30 && bioLen <= 150;
      $('mobile-live-meta').textContent = `簡介 ${bioLines} 行・${ruleOk ? '✓ 符合規定' : '⚠ 請留意字數上限'}`;
    }

    const arc = $('score-ring-arc');
    const offset = RING_CIRCUMFERENCE * (1 - total / 100);
    arc.style.strokeDashoffset = String(offset);
    arc.style.stroke = total >= 80 ? '#15803d' : total >= 55 ? '#ea580c' : '#dc2626';

    $('score-grade-pill').textContent = `等級 ${report.grade || 'B'}`;
    $('score-mode-badge').textContent = report.mode === 'ai' ? '✨ AI 深度診斷完成' : '⚡ 即時體檢引擎';
    $('score-badge-title').textContent = report.badgeTitle || '';
    $('score-summary').textContent = report.summary || '';

    const warnWrap = $('audit-warnings');
    clearChildren(warnWrap);
    (report.warnings || []).forEach((w) => {
      const cls = w.level === 'danger' ? 'warning-danger' : w.level === 'warn' ? 'warning-warn' : 'warning-info';
      warnWrap.appendChild(el('div', `warning-item ${cls}`, w.text));
    });

    const dimsWrap = $('audit-dimensions');
    clearChildren(dimsWrap);
    (report.dimensions || []).forEach((d) => {
      const item = el('div', 'dim-item');
      const head = el('div', 'dim-head');
      head.appendChild(el('span', '', d.label));
      head.appendChild(el('span', '', `${d.score} / ${d.max || 20}`));
      item.appendChild(head);

      const track = el('div', 'dim-bar-track');
      const fill = el('div', `dim-bar-fill dim-${d.status || 'warn'}`);
      fill.style.width = `${Math.max(4, Math.round(((d.score || 0) / (d.max || 20)) * 100))}%`;
      track.appendChild(fill);
      item.appendChild(track);
      item.appendChild(el('p', 'dim-comment', d.comment));
      dimsWrap.appendChild(item);
    });

    const sugWrap = $('audit-suggestions');
    clearChildren(sugWrap);
    (report.suggestions || []).forEach((s) => {
      const card = el('div', 'suggestion-card');
      const head = el('div', 'suggestion-head');
      const label = s.priority === 'high' ? '優先修' : s.priority === 'good' ? '做得好' : '建議補';
      head.appendChild(el('span', `priority-dot priority-${s.priority || 'medium'}`, label));
      head.appendChild(el('span', 'suggestion-title', s.title));
      card.appendChild(head);
      card.appendChild(el('p', 'suggestion-detail', s.detail));
      if (s.example) card.appendChild(el('div', 'suggestion-example', s.example));
      sugWrap.appendChild(card);
    });

    const rewrites = report.rewrites || S.generateLocalRewrites(state);
    const rewWrap = $('audit-rewrites');
    clearChildren(rewWrap);
    rewrites.forEach((rw) => rewWrap.appendChild(createRewriteCard(rw, '套用到預覽')));
  }

  function renderAbBar() {
    $('btn-load-a').disabled = !abStore.A;
    $('btn-load-b').disabled = !abStore.B;
    const diffEl = $('ab-diff-text');
    if (abStore.A && abStore.B) {
      const sA = abStore.A.score;
      const sB = abStore.B.score;
      const diff = sB - sA;
      const sign = diff > 0 ? `+${diff}` : String(diff);
      diffEl.textContent = `A 版：${sA} 分 vs B 版：${sB} 分（差距 ${sign} 分）`;
    } else if (abStore.A) {
      diffEl.textContent = `已存版本 A（${abStore.A.score} 分），調整後可再存一組版本 B 比較`;
    } else if (abStore.B) {
      diffEl.textContent = `已存版本 B（${abStore.B.score} 分）`;
    } else {
      diffEl.textContent = '存成 A 版與 B 版，馬上比較哪版分數高';
    }
  }

  function currentReport() {
    const localReport = S.scoreProfile(state);
    if (!aiReportOverride) return localReport;
    return {
      ...localReport,
      ...aiReportOverride,
      mode: 'ai',
      warnings: localReport.warnings,
      metrics: localReport.metrics,
    };
  }

  function renderAll() {
    const report = currentReport();
    renderCounters(report);
    renderAvatar();
    renderTopicsEditor();
    renderPreview(report);
    renderAudit(report);
    renderAbBar();
    return report;
  }

  function onProfileChanged() {
    aiReportOverride = null;
    saveStorage();
    renderAll();
  }

  function addTopic(raw) {
    const clean = String(raw || '').trim().replace(/^#/, '');
    if (!clean) return;
    if (state.topics.length >= S.LIMITS.topicsMax) {
      showToast(`最多只能放 ${S.LIMITS.topicsMax} 個主題標籤喔`);
      return;
    }
    if (!state.topics.includes(clean)) {
      state.topics.push(clean);
      $('field-topic-input').value = '';
      onProfileChanged();
    }
  }

  function applyRewrite(item) {
    undoSnapshot = JSON.parse(JSON.stringify(state));
    $('btn-undo-rewrite').classList.remove('hidden');

    if (item.displayName) state.displayName = S.trimToLimit(item.displayName, S.LIMITS.displayNameMax);
    if (item.bio) state.bio = S.trimToLimit(item.bio, S.LIMITS.bioMax);
    if (Array.isArray(item.topics) && item.topics.length) {
      state.topics = item.topics.slice(0, S.LIMITS.topicsMax);
    }
    if (item.linkUrl !== undefined && item.linkUrl) state.linkUrl = item.linkUrl;
    if (item.handle) state.handle = item.handle;
    if ($('field-role').value !== state.role) state.role = $('field-role').value;

    syncInputsFromState();
    saveStorage();
    renderAll();
    showToast(`已套用「${item.style}」到預覽，隨時可點還原`);
    if (window.innerWidth < 900) switchMobileTab('preview');
  }

  function undoRewrite() {
    if (!undoSnapshot) return;
    state = undoSnapshot;
    undoSnapshot = null;
    $('btn-undo-rewrite').classList.add('hidden');
    syncInputsFromState();
    onProfileChanged();
    showToast('已還原回套用前的版本');
  }

  function loadSample(key) {
    const sample = S.SAMPLE_PROFILES[key];
    if (!sample) return;
    const presetColors = { shop: '#ea580c', freelancer: '#0f766e', creator: '#2563eb', personal: '#9333ea' };
    state = {
      ...state,
      role: sample.role,
      displayName: sample.displayName,
      handle: sample.handle,
      bio: sample.bio,
      linkUrl: sample.linkUrl,
      linkLabel: sample.linkLabel,
      topics: sample.topics.slice(),
      pinnedPost: sample.pinnedPost,
      avatarDataUrl: '',
      hasCustomAvatar: false,
      avatarColor: presetColors[key] || '#ea580c',
    };
    syncInputsFromState();
    onProfileChanged();
    showToast('已載入範例，你可以直接改字看分數變化！');
  }

  function clearForm() {
    state = {
      role: 'creator',
      displayName: '',
      handle: '',
      bio: '',
      linkUrl: '',
      linkLabel: '',
      topics: [],
      pinnedPost: '',
      hasCustomAvatar: false,
      avatarDataUrl: '',
      avatarColor: '#27272a',
    };
    syncInputsFromState();
    onProfileChanged();
    showToast('已清空欄位，開始寫你自己的版本吧');
  }

  function copyText(text, successMsg) {
    if (!String(text || '').trim()) {
      showToast('目前這個欄位還是空的喔');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(successMsg),
        () => showToast('無法自動複製，請手動選取文字複製')
      );
    } else {
      showToast('目前瀏覽器不支援一鍵複製，請手動選取');
    }
  }

  function saveAbSlot(slot) {
    const report = currentReport();
    abStore[slot] = {
      score: report.total,
      data: JSON.parse(JSON.stringify(state)),
    };
    saveAbStorage();
    renderAbBar();
    showToast(`已存成版本 ${slot}（${report.total} 分）`);
  }

  function loadAbSlot(slot) {
    const entry = abStore[slot];
    if (!entry || !entry.data) return;
    state = JSON.parse(JSON.stringify(entry.data));
    syncInputsFromState();
    onProfileChanged();
    showToast(`已切換回版本 ${slot}（${entry.score} 分）`);
  }

  function switchMobileTab(tab) {
    document.querySelectorAll('.mobile-tab-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tab === tab);
    });
    const map = { edit: 'panel-edit', preview: 'panel-preview', audit: 'panel-audit' };
    Object.keys(map).forEach((k) => {
      $(map[k]).classList.toggle('is-tab-active', k === tab);
    });
    if (window.innerWidth < 900) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function switchEditMode(mode) {
    const isWizard = mode === 'wizard';
    $('btn-mode-free').classList.toggle('is-active', !isWizard);
    $('btn-mode-wizard').classList.toggle('is-active', isWizard);
    $('free-form-wrap').classList.toggle('hidden', isWizard);
    $('wizard-wrap').classList.toggle('hidden', !isWizard);
  }

  function runWizardGenerate() {
    const role = $('wiz-role').value;
    state.role = role;
    const drafts = S.buildFromWizard({
      role,
      displayName: $('wiz-name').value,
      who: $('wiz-who').value,
      value: $('wiz-value').value,
      action: $('wiz-action').value,
      linkUrl: $('wiz-link').value,
    });
    const wrap = $('wiz-results');
    clearChildren(wrap);
    drafts.forEach((draft) => {
      wrap.appendChild(createRewriteCard(draft, '套用到左邊＆看分數'));
    });
    showToast('已組合 3 版首頁草稿，挑一版按套用看看！');
  }

  function normalizeAiReport(raw, localFallback) {
    if (!raw || typeof raw !== 'object') return null;
    const rawDims = Array.isArray(raw.dimensions) ? raw.dimensions : [];
    const safeDims = localFallback.dimensions.map((baseDim, idx) => {
      const found = rawDims.find((d) => d && (d.key === baseDim.key || d.label === baseDim.label)) || rawDims[idx];
      if (!found) return baseDim;
      const sc = Math.max(0, Math.min(20, Math.round(Number(found.score) || baseDim.score)));
      return {
        key: baseDim.key,
        label: baseDim.label,
        max: 20,
        score: sc,
        status: sc >= 16 ? 'good' : sc >= 10 ? 'warn' : 'bad',
        comment: String(found.comment || baseDim.comment),
      };
    });
    const sumTotal = safeDims.reduce((s, d) => s + d.score, 0);
    const total = Math.max(0, Math.min(100, Math.round(Number(raw.total) || sumTotal)));
    const rewrites = Array.isArray(raw.rewrites) && raw.rewrites.length
      ? raw.rewrites.slice(0, 3).map((rw) => ({
          style: String(rw.style || 'AI 改寫版'),
          tag: String(rw.tag || 'AI 量身調整'),
          reason: String(rw.reason || ''),
          displayName: S.trimToLimit(String(rw.displayName || state.displayName), S.LIMITS.displayNameMax),
          bio: S.trimToLimit(String(rw.bio || state.bio), S.LIMITS.bioMax),
          topics: state.topics.slice(),
        }))
      : S.generateLocalRewrites(state);

    const suggestions = Array.isArray(raw.suggestions) && raw.suggestions.length
      ? raw.suggestions.slice(0, 4).map((s) => ({
          priority: ['high', 'medium', 'good'].includes(s.priority) ? s.priority : 'medium',
          title: String(s.title || '優化建議'),
          detail: String(s.detail || ''),
          example: String(s.example || ''),
        }))
      : localFallback.suggestions;

    return {
      total,
      grade: ['S', 'A', 'B', 'C'].includes(raw.grade) ? raw.grade : localFallback.grade,
      badgeTitle: String(raw.badgeTitle || localFallback.badgeTitle),
      summary: String(raw.summary || localFallback.summary),
      dimensions: safeDims,
      suggestions,
      rewrites,
    };
  }

  async function runAiAudit() {
    const now = Date.now();
    const cooldown = Number(CFG.AI_COOLDOWN_MS) || 10000;
    if (now - lastAiCallAt < cooldown) {
      showToast('剛才才診斷過，稍等幾秒再送一次喔');
      return;
    }

    const localFallback = S.scoreProfile(state);
    if (!state.displayName.trim() && !state.bio.trim()) {
      showToast('先寫一點點名稱或簡介，或點上方範例，我才能幫你看喔');
      return;
    }

    const webhook = String(CFG.AI_AUDIT_WEBHOOK_URL || '').trim();
    const btn = $('btn-ai-audit');
    const note = $('ai-status-note');

    if (!webhook) {
      aiReportOverride = null;
      renderAll();
      note.textContent = '目前以即時免連線引擎完成體檢與 3 版量身改寫（設定 AI Webhook 後可切換為 Gemini 深度語意診斷）。';
      showToast('已完成即時診斷與 3 版改寫提案！');
      return;
    }

    lastAiCallAt = now;
    btn.disabled = true;
    btn.textContent = '⏳ AI 正在仔細讀你的首頁...';
    note.textContent = '正在請 AI 幫你檢查語氣與定位（約 5～15 秒）...';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    try {
      const resp = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          role: state.role,
          displayName: state.displayName.slice(0, 60),
          handle: state.handle.slice(0, 50),
          bio: state.bio.slice(0, 300),
          linkUrl: state.linkUrl.slice(0, 200),
          linkLabel: state.linkLabel.slice(0, 60),
          topics: state.topics.slice(0, 3),
          pinnedPost: state.pinnedPost.slice(0, 400),
          website_hp: '',
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const parsed = normalizeAiReport(data.report || data, localFallback);
      if (!parsed) throw new Error('Invalid AI payload');
      aiReportOverride = parsed;
      renderAll();
      note.textContent = '✨ 已透過 Gemini 完成 AI 深度診斷與 3 版客製改寫！';
      showToast('AI 深度診斷完成！');
    } catch (_) {
      aiReportOverride = null;
      renderAll();
      note.textContent = 'AI 連線目前忙碌或未啟動，已自動改用即時免連線引擎完成體檢與 3 版改寫。';
      showToast('已用免連線引擎完成體檢與 3 版改寫');
    } finally {
      clearTimeout(timer);
      btn.disabled = false;
      btn.textContent = '✨ AI 深度診斷與量身改寫';
    }
  }

  function bindEvents() {
    $('btn-mode-free').addEventListener('click', () => switchEditMode('free'));
    $('btn-mode-wizard').addEventListener('click', () => switchEditMode('wizard'));

    document.querySelectorAll('.sample-btn[data-sample]').forEach((btn) => {
      btn.addEventListener('click', () => loadSample(btn.dataset.sample));
    });
    $('btn-clear-form').addEventListener('click', clearForm);

    $('field-role').addEventListener('change', (e) => {
      state.role = e.target.value;
      $('wiz-role').value = state.role;
      onProfileChanged();
    });
    $('field-name').addEventListener('input', (e) => {
      state.displayName = e.target.value;
      onProfileChanged();
    });
    $('field-handle').addEventListener('input', (e) => {
      state.handle = e.target.value.replace(/^@+/, '');
      onProfileChanged();
    });
    $('field-bio').addEventListener('input', (e) => {
      state.bio = e.target.value;
      onProfileChanged();
    });
    $('field-link').addEventListener('input', (e) => {
      state.linkUrl = e.target.value;
      onProfileChanged();
    });
    $('field-link-label').addEventListener('input', (e) => {
      state.linkLabel = e.target.value;
      onProfileChanged();
    });
    $('field-pinned').addEventListener('input', (e) => {
      state.pinnedPost = e.target.value;
      onProfileChanged();
    });

    $('btn-upload-avatar').addEventListener('click', () => $('avatar-upload').click());
    $('avatar-upload').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!ALLOWED_AVATAR_MIME.has(file.type)) {
        showToast('請選擇 JPG、PNG、WebP 或 GIF 圖片檔');
        return;
      }
      if (file.size > MAX_AVATAR_BYTES) {
        showToast('圖片太大囉，請挑選 5MB 以下的圖片');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
          state.avatarDataUrl = reader.result;
          state.hasCustomAvatar = true;
          onProfileChanged();
          showToast('已套用頭像預覽（僅留在本機瀏覽器）');
        }
      };
      reader.readAsDataURL(file);
    });

    $('btn-clear-avatar').addEventListener('click', () => {
      state.avatarDataUrl = '';
      state.hasCustomAvatar = false;
      $('avatar-upload').value = '';
      onProfileChanged();
    });

    document.querySelectorAll('.avatar-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.avatarDataUrl = '';
        state.hasCustomAvatar = false;
        state.avatarColor = btn.dataset.preset || '#ea580c';
        syncInputsFromState();
        onProfileChanged();
      });
    });

    document.querySelectorAll('.bio-chip-btn[data-insert]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const area = $('field-bio');
        const snippet = btn.dataset.insert || '';
        const start = area.selectionStart || area.value.length;
        const end = area.selectionEnd || area.value.length;
        area.value = area.value.slice(0, start) + snippet + area.value.slice(end);
        state.bio = area.value;
        area.focus();
        onProfileChanged();
      });
    });

    $('btn-bio-template').addEventListener('click', () => {
      state.bio = '📍 我是誰／在哪裡（例如：新莊一人工作室）\n✨ 我能幫什麼忙或招牌特色\n👇 點下方看更多介紹／免費試用';
      $('field-bio').value = state.bio;
      onProfileChanged();
      showToast('已填入三行黃金格式，把括號字換成你的內容就行！');
    });

    $('btn-add-topic').addEventListener('click', () => addTopic($('field-topic-input').value));
    $('field-topic-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTopic(e.target.value);
      }
    });

    $('btn-save-a').addEventListener('click', () => saveAbSlot('A'));
    $('btn-save-b').addEventListener('click', () => saveAbSlot('B'));
    $('btn-load-a').addEventListener('click', () => loadAbSlot('A'));
    $('btn-load-b').addEventListener('click', () => loadAbSlot('B'));

    $('btn-wiz-generate').addEventListener('click', runWizardGenerate);

    $('btn-theme-dark').addEventListener('click', () => {
      previewTheme = 'dark';
      $('phone-shell').setAttribute('data-theme', 'dark');
      $('btn-theme-dark').classList.add('is-active');
      $('btn-theme-light').classList.remove('is-active');
    });
    $('btn-theme-light').addEventListener('click', () => {
      previewTheme = 'light';
      $('phone-shell').setAttribute('data-theme', 'light');
      $('btn-theme-light').classList.add('is-active');
      $('btn-theme-dark').classList.remove('is-active');
    });

    $('btn-copy-name').addEventListener('click', () => copyText(state.displayName, '已複製顯示名稱！'));
    $('btn-copy-bio').addEventListener('click', () => copyText(state.bio, '已複製個人簡介！'));
    $('btn-download-card').addEventListener('click', () => {
      const report = currentReport();
      Card.downloadReportCard(state, report, previewTheme);
      showToast('正在下載體檢成績單 PNG！');
    });

    $('btn-ai-audit').addEventListener('click', runAiAudit);
    $('btn-undo-rewrite').addEventListener('click', undoRewrite);

    document.querySelectorAll('.mobile-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchMobileTab(btn.dataset.tab));
    });
    if ($('btn-mobile-quick-preview')) {
      $('btn-mobile-quick-preview').addEventListener('click', () => switchMobileTab('preview'));
    }
    if ($('btn-mobile-to-preview')) {
      $('btn-mobile-to-preview').addEventListener('click', () => switchMobileTab('preview'));
    }

    $('btn-open-rules').addEventListener('click', () => $('rules-modal').classList.remove('hidden'));
    $('btn-close-rules').addEventListener('click', () => $('rules-modal').classList.add('hidden'));
    $('btn-close-rules-bottom').addEventListener('click', () => $('rules-modal').classList.add('hidden'));
    $('rules-modal').addEventListener('click', (e) => {
      if (e.target === $('rules-modal')) $('rules-modal').classList.add('hidden');
    });
  }

  function init() {
    loadStorage();
    syncInputsFromState();
    bindEvents();
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})(typeof self !== 'undefined' ? self : this);
