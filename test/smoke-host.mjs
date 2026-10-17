// Offline smoke test for dsh-plugin-translate (host half + preset provider).
// Runs against a throwaway DSH_HOME so the real settings file is untouched.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = mkdtempSync(join(tmpdir(), 'dsh-translate-smoke-'))
process.env.DSH_HOME = home

const store = await import('../lib/store.js')
const host = await import('../lib/index.js')
const preset = await import('../lib/preset.js')
const languages = await import('../lib/languages.js')

const failures = []
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  [' + detail + ']' : ''}`)
  if (!ok) failures.push(label)
}

// --- store ---------------------------------------------------------------
const initial = store.readSettings()
check(
  'defaults when file missing',
  initial.source === 'auto' && initial.target === 'auto' && initial.allowSame === true &&
    Array.isArray(initial.custom) && Array.isArray(initial.stylePresets) && initial.uiLocale === ''
)

const written = store.writeSettings({
  source: 'ja',
  target: 'fr',
  style: '正式',
  allowSame: false,
  custom: [{ code: 'yue', label: '粤语' }],
  stylePresets: [{ id: 'p1', name: '正式', style: '正式' }]
})
check(
  'write + merge',
  written.source === 'ja' && written.target === 'fr' && written.allowSame === false &&
    written.custom.length === 1 && written.stylePresets.length === 1
)
check('persisted file path', store.storePath() === join(home, 'translate-settings.json'), store.storePath())

const reread = store.readSettings()
check('round-trip is stable', JSON.stringify(reread) === JSON.stringify(written))

const partial = store.writeSettings({ target: 'de' })
check(
  'partial patch keeps other fields',
  partial.source === 'ja' && partial.target === 'de' && partial.style === '正式' &&
    partial.allowSame === false && partial.stylePresets.length === 1
)

writeFileSync(store.storePath(), '{ not json')
check('corrupt file falls back to defaults', store.readSettings().target === 'auto')
writeFileSync(store.storePath(), JSON.stringify({ source: 'ja', target: 'yue-custom' }))
check('legacy 3-field file is accepted', store.readSettings().allowSame === true && store.readSettings().target === 'yue-custom')
writeFileSync(store.storePath(), JSON.stringify({ source: 'auto', target: 'en', style: '' }))
check('pre-auto file migrates en -> auto', store.readSettings().target === 'auto')
writeFileSync(store.storePath(), JSON.stringify({ source: 'auto', target: 'fr', style: '', uiLocale: 'ja' }))
check('explicit non-default target is preserved', store.readSettings().target === 'fr' && store.readSettings().uiLocale === 'ja')
const withLocale = store.writeSettings({ target: 'auto', uiLocale: 'en' })
check('uiLocale round-trips through the store', withLocale.uiLocale === 'en' && store.readSettings().uiLocale === 'en')

// --- host plugin ---------------------------------------------------------
store.writeSettings({ source: 'auto', target: 'en', style: '', allowSame: true, custom: [], stylePresets: [] })

const routes = []
const tools = []
const effects = []
const fakePresets = {
  list: async () => [{ id: 'standard' }, { id: 'translate' }],
  resolve: async (id) => ({ id, name: '翻译模式' }),
  compositionInventory: async () => [{ id: 'translate', rows: [] }]
}
const ctx = {
  effect(fn, label) {
    const disposer = fn()
    effects.push({ label, disposer })
    return disposer
  },
  webServer: {
    register(route) {
      routes.push(route)
      return () => {}
    },
    getOrigin: () => 'http://127.0.0.1:1'
  },
  tools: {
    register(definition) {
      tools.push(definition)
      return () => {}
    }
  },
  logger: { warn: (...args) => console.log('  [logger.warn]', ...args) },
  get(key) {
    return key === 'agentPresets' ? fakePresets : undefined
  }
}
host.apply(ctx, undefined)
check('plugin exports name/inject', host.name === 'dsh-translate' && JSON.stringify(host.inject) === JSON.stringify(['webServer', 'tools']))
check('registers exactly one exact route', routes.length === 1 && routes[0].kind === 'exact' && routes[0].path === '/dsh-translate/settings')
check('registers translate_diag', tools.length === 1 && tools[0].name === 'translate_diag')
check('two effect-owned registrations', effects.length === 2)

function makeRes() {
  return {
    status: 0,
    headers: null,
    body: '',
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    end(body) {
      this.body = body === undefined ? '' : String(body)
    }
  }
}
async function call(method, body) {
  const res = makeRes()
  const req = {
    method,
    async *[Symbol.asyncIterator]() {
      if (body !== undefined) yield Buffer.from(body)
    }
  }
  await routes[0].handler(req, res)
  return { status: res.status, body: res.body ? JSON.parse(res.body) : undefined }
}

const got = await call('GET')
check('GET returns the full settings shape', got.status === 200 && got.body.allowSame === true && Array.isArray(got.body.stylePresets) && 'source' in got.body)
const posted = await call('POST', JSON.stringify({ target: 'it', style: '简洁' }))
check('POST merges and answers ok', posted.status === 200 && posted.body.ok === true && posted.body.settings.target === 'it' && posted.body.settings.style === '简洁')
check('POST persisted to disk', store.readSettings().target === 'it' && store.readSettings().style === '简洁')
const bad = await call('POST', 'not json')
check('POST invalid JSON -> 500 {ok:false}', bad.status === 500 && bad.body.ok === false && typeof bad.body.error === 'string')
const rejected = await call('DELETE')
check('unsupported method -> 405', rejected.status === 405)

const diag = await tools[0].execute({})
check('diag returns text', typeof diag === 'string' && diag.includes('设置文件') && diag.includes('写回自检: ok') && diag.includes('translate 预设'))
console.log('---- translate_diag ----')
console.log(diag)
console.log('------------------------')

// --- preset provider -----------------------------------------------------
const variables = {}
const presetCtx = {
  effect(fn) {
    fn()
    return () => {}
  },
  systemPrompt: {
    variable(name, provider) {
      variables[name] = provider
      return () => {}
    }
  }
}
preset.apply(presetCtx)
check('preset plugin injects systemPrompt', JSON.stringify(preset.inject) === JSON.stringify(['systemPrompt']))
check(
  'registers three variables',
  Object.keys(variables).sort().join(',') === 'translatesource,translatestyle,translatetarget'
)

store.writeSettings({ source: 'auto', target: 'fr', style: '正式' })
check('source=auto renders 自动检测', variables.translatesource() === '自动检测')
check('target renders language label', variables.translatetarget() === 'Français')
check('style renders the stored style', variables.translatestyle() === '正式')

store.writeSettings({ source: 'ja', style: '   ' })
check('source renders language label', variables.translatesource() === '日本語')
check('blank style falls back to default', variables.translatestyle() === '自然、忠实、通顺')

store.writeSettings({ target: 'yue-custom' })
check('unknown custom target renders its code', variables.translatetarget() === 'yue-custom')

// --- target 'auto' resolution rule ---------------------------------------
check(
  'auto target (zh UI) resolves to Chinese, else English',
  languages.describeTarget({ target: 'auto', uiLocale: 'zh' }) === '自动：原文不是中文时译为中文；原文是中文时译为英语'
)
check(
  'auto target (en UI) resolves to English, else Chinese',
  languages.describeTarget({ target: 'auto', uiLocale: 'en' }) === '自动：原文不是英语时译为英语；原文是英语时译为中文'
)
check(
  'auto target (ja UI) resolves to Japanese, else English',
  languages.describeTarget({ target: 'auto', uiLocale: 'ja' }) === '自动：原文不是日本語时译为日本語；原文是日本語时译为英语'
)
check('auto target defaults to a Chinese UI', languages.describeTarget({ target: 'auto' }).includes('中文'))
check('concrete target renders its label', languages.describeTarget({ target: 'fr' }) === 'Français')

store.writeSettings({ target: 'auto', uiLocale: 'en' })
check('target variable renders the auto rule', variables.translatetarget().includes('原文不是英语时译为英语'))

rmSync(home, { recursive: true, force: true })
console.log('---')
console.log(failures.length === 0 ? 'ALL PASS' : `FAILED: ${failures.join(' | ')}`)
process.exit(failures.length === 0 ? 0 : 1)
