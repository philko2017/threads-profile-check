(function (root) {
  'use strict';

  function wrapCanvasText(ctx, text, maxWidth) {
    const lines = [];
    const paragraphs = String(text || '').replace(/\r\n/g, '\n').split('\n');
    for (let p = 0; p < paragraphs.length; p += 1) {
      const para = paragraphs[p];
      if (!para) {
        lines.push('');
        continue;
      }
      const chars = Array.from(para);
      let current = '';
      for (let i = 0; i < chars.length; i += 1) {
        const test = current + chars[i];
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current);
          current = chars[i];
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  }

  function drawRoundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth || 2;
      ctx.stroke();
    }
  }

  function downloadReportCard(profile, report, theme) {
    const isDark = theme !== 'light';
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');

    const bg = isDark ? '#111113' : '#f6f4ef';
    const cardBg = isDark ? '#1b1b1f' : '#ffffff';
    const borderCol = isDark ? '#2d2d34' : '#e5e2dc';
    const textMain = isDark ? '#fafafa' : '#18181b';
    const textMuted = isDark ? '#a1a1aa' : '#6b7280';
    const accent = '#ea580c';

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = accent;
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    ctx.fillText('THREADS 首頁體檢成績單', 68, 86);

    ctx.fillStyle = textMuted;
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    ctx.fillText('改版前先預覽，避開 14 天修改限制', 68, 126);

    // Score hero card
    drawRoundRect(ctx, 64, 158, 952, 200, 28, cardBg, borderCol, 2);

    const scoreRatio = Math.max(0, Math.min(1, (report.total || 0) / 100));
    const cx = 178;
    const cy = 258;
    const radius = 64;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = isDark ? '#2e2e36' : '#f1ede5';
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * scoreRatio);
    ctx.strokeStyle = report.total >= 80 ? '#16a34a' : report.total >= 60 ? accent : '#dc2626';
    ctx.lineCap = 'round';
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.fillStyle = textMain;
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    ctx.fillText(String(report.total || 0), cx, cy + 12);
    ctx.fillStyle = textMuted;
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    ctx.fillText('分 / 100', cx, cy + 38);

    ctx.textAlign = 'left';
    drawRoundRect(ctx, 276, 194, 118, 40, 20, isDark ? '#2a1c14' : '#ffedd5', accent, 1.5);
    ctx.fillStyle = accent;
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    ctx.fillText(`等級 ${report.grade || 'B'}`, 298, 222);

    ctx.fillStyle = textMain;
    ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    ctx.fillText(report.badgeTitle || '首頁體檢完成', 410, 226);

    ctx.fillStyle = textMuted;
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    const summaryLines = wrapCanvasText(ctx, report.summary || '', 700).slice(0, 2);
    summaryLines.forEach((line, idx) => {
      ctx.fillText(line, 276, 278 + idx * 36);
    });

    // Profile snapshot card
    drawRoundRect(ctx, 64, 386, 952, 410, 28, cardBg, borderCol, 2);

    ctx.fillStyle = textMain;
    ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    ctx.fillText(profile.displayName || '（未填寫顯示名稱）', 102, 448);

    ctx.fillStyle = textMuted;
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    ctx.fillText(profile.handle ? `@${profile.handle.replace(/^@+/, '')}` : '@your_handle', 102, 486);

    ctx.fillStyle = textMain;
    ctx.font = '26px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    const bioLines = wrapCanvasText(ctx, profile.bio || '（尚未填寫個人簡介）', 872).slice(0, 5);
    bioLines.forEach((line, idx) => {
      ctx.fillText(line, 102, 536 + idx * 36);
    });

    const cleanDomain = String(profile.linkUrl || '')
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0];
    if (cleanDomain) {
      ctx.fillStyle = accent;
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
      ctx.fillText(`🔗 ${profile.linkLabel || cleanDomain}（${cleanDomain}）`.slice(0, 48), 102, 712);
    }

    const topics = Array.isArray(profile.topics) ? profile.topics : [];
    let pillX = 102;
    topics.slice(0, 3).forEach((topic) => {
      ctx.font = '22px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
      const tw = ctx.measureText(topic).width + 36;
      if (pillX + tw < 960) {
        drawRoundRect(ctx, pillX, 734, tw, 42, 21, isDark ? '#27272e' : '#f4f1ea', borderCol, 1.5);
        ctx.fillStyle = textMain;
        ctx.fillText(topic, pillX + 18, 763);
        pillX += tw + 14;
      }
    });

    // Dimensions bars
    drawRoundRect(ctx, 64, 824, 952, 424, 28, cardBg, borderCol, 2);
    ctx.fillStyle = textMain;
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    ctx.fillText('五大維度評分明細', 102, 878);

    const dims = Array.isArray(report.dimensions) ? report.dimensions : [];
    dims.slice(0, 5).forEach((dim, idx) => {
      const rowY = 934 + idx * 62;
      ctx.fillStyle = textMain;
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
      ctx.fillText(dim.label, 102, rowY);

      const barX = 288;
      const barW = 570;
      const fillW = Math.max(12, Math.round(barW * Math.max(0, Math.min(1, (dim.score || 0) / (dim.max || 20)))));
      drawRoundRect(ctx, barX, rowY - 20, barW, 24, 12, isDark ? '#27272f' : '#ede9e0');
      const barCol = dim.score >= 16 ? '#16a34a' : dim.score >= 10 ? accent : '#dc2626';
      drawRoundRect(ctx, barX, rowY - 20, fillW, 24, 12, barCol);

      ctx.fillStyle = textMain;
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${dim.score} / ${dim.max || 20}`, 972, rowY);
      ctx.textAlign = 'left';
    });

    // Footer
    ctx.fillStyle = textMuted;
    ctx.font = '22px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    ctx.fillText('免費體驗：Threads 首頁體檢器（免登入・免授權）', 68, 1304);
    ctx.textAlign = 'right';
    const cfg = root.THREADS_AUDIT_CONFIG || {};
    ctx.fillText(`by @${cfg.ADMIN_THREADS_HANDLE || 'its.all.good.73'}`, 1012, 1304);
    ctx.textAlign = 'left';

    const link = document.createElement('a');
    link.download = `threads-profile-score-${report.total || 0}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  root.ThreadsAuditCard = { downloadReportCard };
})(typeof self !== 'undefined' ? self : this);
