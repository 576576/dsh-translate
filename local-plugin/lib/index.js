/**
 * dsh-plugin-translate — Host half (static local plugin).
 *
 * Mounted through the desktop profile's cordis.patch.yml, so it appears under
 * 设置 → 插件 (Settings → Plugins). Replaces the dynamic trsl-2 plugin.
 *
 * Responsibilities:
 *  - HTTP route /dsh-translate/settings (GET = current cfg, POST = save):
 *    writes <DSH_HOME>/translate-settings.json under an explicit
 *    workspace-write sandbox policy rooted at DSH_HOME.
 *  - agent/pre-step interception: after settings change, inserts a
 *    「翻译设置」 context message before the first user message — but ONLY in
 *    sessions whose composed agent preset is `translate`. Non-translate
 *    sessions never receive translation-settings context.
 *  - translate_diag tool: diagnoses the settings write chain and the
 *    translate preset mount (registered defensively, since the dynamic
 *    trsl-2 may still hold the name during a transition).
 */
const name = "dsh-translate";
const inject = ["webServer", "tools"];

const LANG_LABELS = { zh: '中文', en: 'English', ja: '日本語', ko: '한국어', fr: 'Français', de: 'Deutsch', es: 'Español', ru: 'Русский', pt: 'Português', it: 'Italiano', ar: 'العربية', hi: 'हिन्दी', th: 'ไทย', vi: 'Tiếng Việt', nl: 'Nederlands', pl: 'Polski', tr: 'Türkçe', uk: 'Українська' };
let cfg = { source: 'auto', target: 'en', style: '' };
let lastAnnounced = null;
let seq = 0;

function settingsSignature(c) {
  return c.source + '|' + c.target + '|' + c.style;
}

function settingsNote(c) {
  const source = c.source === 'auto' ? '自动检测' : (LANG_LABELS[c.source] || c.source);
  const target = LANG_LABELS[c.target] || c.target;
  const style = c.style && c.style.trim() ? c.style : '无（默认：自然、忠实、通顺）';
  return '【翻译设置】源语言：' + source + '；目标语言：' + target + '；风格要求：' + style + '。本条消息起按此设置翻译。';
}

function deriveHome(ctx) {
  const presets = ctx.get('agentPresets');
  if (!presets) return null;
  try {
    const roots = presets.roots || [];
    const user = roots.find((r) => r && r.trust === 'user');
    if (user && typeof user.path === 'string') return user.path.replace(/[\\/]\.agent-presets\s*$/, '');
    const any = roots.find((r) => r && typeof r.path === 'string');
    return any ? any.path : null;
  } catch (e) {
    return null;
  }
}

async function saveSettings(ctx, v) {
  const next = {
    source: typeof v.source === 'string' && v.source ? v.source : cfg.source,
    target: typeof v.target === 'string' && v.target ? v.target : cfg.target,
    style: typeof v.style === 'string' ? v.style : cfg.style
  };
  cfg = next;
  const fs = ctx.get('fs');
  if (!fs) return { ok: false, error: 'fs 服务不可用' };
  const home = deriveHome(ctx);
  if (!home) return { ok: false, error: '无法确定 DSH_HOME（agentPresets 不可用）' };
  try {
    const target = await fs.resolve(home + '/translate-settings.json', { cwd: home });
    await fs.writeText(target, JSON.stringify(next, null, 2), undefined, undefined, { mode: 'workspace-write', workspaceRoot: home });
    return { ok: true, home };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) };
  }
}

async function diagnose(ctx) {
  const steps = [];
  const fs = ctx.get('fs');
  steps.push('fs 服务: ' + (fs ? '可用' : '不可用'));
  const presets = ctx.get('agentPresets');
  if (!presets) {
    steps.push('agentPresets 服务: 不可用');
  } else {
    steps.push('agentPresets 服务: 可用');
    try {
      const roots = presets.roots || [];
      steps.push('roots: ' + JSON.stringify(roots.map((r) => ({ path: r && r.path, trust: r && r.trust }))));
      const user = roots.find((r) => r && r.trust === 'user');
      const derived = user && typeof user.path === 'string' ? user.path.replace(/[\\/]\.agent-presets\s*$/, '') : null;
      steps.push('推导 DSH_HOME: ' + (derived || 'null'));
      if (derived && fs) {
        try {
          const target = await fs.resolve(derived + '/translate-settings.json', { cwd: derived });
          steps.push('resolve: ok -> ' + target.targetKey);
          const out = await fs.writeText(target, JSON.stringify({ source: cfg.source, target: cfg.target, style: cfg.style }, null, 2), undefined, undefined, { mode: 'workspace-write', workspaceRoot: derived });
          steps.push('writeText: ok -> ' + JSON.stringify(out));
        } catch (e) {
          steps.push('写入异常: ' + ((e && e.message) || String(e)));
        }
      }
      try {
        const key = await presets.standingKeyFor('translate');
        steps.push('translate 预设挂载: ok -> ' + JSON.stringify(key));
      } catch (e) {
        steps.push('translate 预设挂载异常: ' + ((e && e.message) || String(e)));
      }
      try {
        const list = await presets.list();
        steps.push('roster: ' + JSON.stringify(list.map((p) => p.id)));
      } catch (e) {
        steps.push('list 异常: ' + ((e && e.message) || String(e)));
      }
    } catch (e) {
      steps.push('读取 roots 异常: ' + ((e && e.message) || String(e)));
    }
  }
  return steps.join('\n');
}

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(body === void 0 ? void 0 : JSON.stringify(body));
}

function apply(ctx) {
  ctx.effect(() => {
    saveSettings(ctx, cfg).then((r) => {
      console.log('[dsh-translate] 激活时初始写入: ' + (r.ok ? r.home : ('失败 ' + r.error)));
    }).catch((e) => {
      console.log('[dsh-translate] 激活时初始写入异常: ' + String(e));
    });
    return () => { /* noop */ };
  }, 'dsh-translate: initial write');

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-translate/settings',
    handler: async (req, res) => {
      try {
        if (req.method === 'GET' || req.method === 'HEAD') {
          json(res, 200, { source: cfg.source, target: cfg.target, style: cfg.style });
          return;
        }
        if (req.method === 'POST') {
          let raw = '';
          for await (const chunk of req) raw += chunk;
          let v;
          try {
            v = JSON.parse(raw);
          } catch {
            v = {};
          }
          const r = await saveSettings(ctx, v && typeof v === 'object' ? v : {});
          json(res, r.ok ? 200 : 500, r);
          return;
        }
        res.writeHead(405);
        res.end();
      } catch (cause) {
        ctx.logger.warn('dsh-translate: request failed: %s', cause instanceof Error ? cause.message : String(cause));
        try {
          json(res, 500, { error: 'internal error' });
        } catch {
          /* response already committed */
        }
      }
    }
  }), 'dsh-translate: settings route');

  ctx.on('agent/pre-step', async ({ agent, messages }, next) => {
    const decision = await next();
    if (decision.kind !== 'enter') return decision;
    // 绝对只在翻译模式会话注入：非翻译模式即使设置变更也不注入任何上下文
    const presets = ctx.get('agentPresets');
    if (!presets) return decision;
    let inTranslate = false;
    try {
      inTranslate = presets.composedPreset(agent && agent.ctx) === 'translate';
    } catch (e) {
      inTranslate = false;
    }
    if (!inTranslate) return decision;
    const claimed = new Set((messages || []).filter((m) => m && m.source && m.source.kind === 'user'));
    if (claimed.size === 0) return decision;
    const signature = settingsSignature(cfg);
    if (signature === lastAnnounced) return decision;
    const idx = decision.messages.findIndex((m) => claimed.has(m));
    if (idx < 0) return decision;
    const note = {
      id: 'dtr-ctx-' + (++seq),
      role: 'user',
      content: [{ type: 'text', text: settingsNote(cfg) }],
      source: { kind: 'plugin', plugin: 'dsh-translate' }
    };
    lastAnnounced = signature;
    return { kind: 'enter', messages: decision.messages.toSpliced(idx, 0, note) };
  });

  ctx.effect(() => {
    const tool = {
      name: 'translate_diag',
      description: '诊断翻译模式：检查 fs/agentPresets 服务、DSH_HOME 推导、设置文件写入，并验证 translate 预设可被 roster 挂载（standingKeyFor）。',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: {
        schema: { type: 'string' },
        render: (args, value) => [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }]
      },
      execute: async () => await diagnose(ctx)
    };
    try {
      return ctx.tools.register(tool);
    } catch (e) {
      // 动态插件 trsl-2 尚在运行时会重名；过渡期跳过，不拖垮本插件
      ctx.logger.warn('dsh-translate: diag tool skipped: %s', e instanceof Error ? e.message : String(e));
      return () => { /* noop */ };
    }
  }, 'dsh-translate: diag tool');
}

export { apply, inject, name };
