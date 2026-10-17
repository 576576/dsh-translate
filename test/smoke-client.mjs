// Stub-runtime smoke test for the dsh-plugin-translate client half.
// Verifies module execution, slot registration, labels and the host GET call
// without a browser.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const code = readFileSync(fileURLToPath(new URL('../lib/client.js', import.meta.url)), 'utf8')

const failures = []
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  [' + detail + ']' : ''}`)
  if (!ok) failures.push(label)
}

// ---- browser stubs -------------------------------------------------------
const slots = []
const effects = []
const localeNamespaces = []
const styleNodes = []
const fetchCalls = []
const storage = new Map()

const React = {
  createElement: () => null,
  useState: () => [undefined, () => {}],
  useEffect: () => {},
  useRef: () => ({ current: null }),
  useMemo: (fn) => fn(),
  useSyncExternalStore: () => undefined,
  memo: (c) => c
}

let factory = null
globalThis.window = {
  __ModuleLoader__: {
    load: (definition) => {
      if (definition.id !== 'dsh-plugin-translate') failures.push('module id mismatch')
      factory = definition.factory
    }
  }
}
globalThis.document = {
  createElement: () => ({
    dataset: {},
    textContent: '',
    remove() {}
  }),
  head: { appendChild: (node) => styleNodes.push(node) }
}
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, value)
}
globalThis.fetch = (url, init) => {
  fetchCalls.push({ url, method: (init && init.method) || 'GET' })
  if ((init && init.method) === 'POST') {
    return Promise.resolve({ ok: true, json: async () => ({ ok: true, settings: {} }) })
  }
  return Promise.resolve({
    ok: true,
    json: async () => ({
      source: 'ja',
      target: 'fr',
      style: '正式',
      allowSame: false,
      custom: [{ code: 'yue', label: '粤语' }],
      stylePresets: [{ id: 'p1', name: '正式', style: '正式' }]
    })
  })
}

const requireStub = (name) => {
  if (name === 'react') return React
  throw new Error(`unexpected require: ${name}`)
}

// ---- load the module -----------------------------------------------------
check('module registers a factory', (() => {
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'localStorage', 'fetch', 'require', code)(
    globalThis.window, globalThis.document, globalThis.localStorage, globalThis.fetch, requireStub
  )
  return true
})())
check('factory captured', typeof factory === 'function')
const exported = factory(requireStub)
check('exports apply/inject', typeof exported.apply === 'function' && JSON.stringify(exported.inject) === JSON.stringify(['slots', 'locale']))

// ---- run apply -----------------------------------------------------------
const ctx = {
  locale: {
    register: (ns) => {
      localeNamespaces.push(ns)
      return () => {}
    },
    bind: (ns) => (key) => `${ns}:${key}`,
    subscribe: () => () => {},
    getSnapshot: () => ({})
  },
  effect: (fn, label) => {
    const disposer = fn()
    effects.push({ label, disposer })
    return disposer
  },
  slots: {
    inject: (key, callback) => {
      const disposer = callback()
      return disposer
    },
    register: (options, component) => {
      slots.push({ options, component })
      return () => {}
    }
  }
}
exported.apply(ctx)

check('locale dictionary registered once', localeNamespaces.length === 1 && localeNamespaces[0] === 'dsh-translate')
check('two slots registered', slots.length === 2, slots.map((s) => s.options.id).join(','))
const byKey = Object.fromEntries(slots.map((s) => [s.options.name, s.options]))
check('input.right registration', byKey['conversation.input.right'] && byKey['conversation.input.right'].id === 'translate-mode')
check('style popup is not an overlay-slot panel', !byKey['conversation.input.overlay'])
check('settings.section registration', byKey['settings.section'] && byKey['settings.section'].id === 'translate-settings')
check('labels are thunks', slots.every((s) => typeof s.options.label === 'function'))
check('input.right label localized', byKey['conversation.input.right'].label() === 'dsh-translate:settingsTitle', byKey['conversation.input.right'].label())
check('components are functions', slots.every((s) => typeof s.component === 'function'))
check('style element injected', styleNodes.length === 1)
check('style text uses only valid tokens', (() => {
  const css = styleNodes[0].textContent
  const used = [...new Set(css.match(/--dsw-[a-zA-Z0-9-]+/g) || [])]
  const valid = new Set([
    '--dsw-alias-bg-module-platform', '--dsw-alias-border-inverted', '--dsw-alias-border-l1',
    '--dsw-alias-border-l2', '--dsw-alias-border-l3', '--dsw-alias-brand-primary',
    '--dsw-alias-interactive-bg-hover', '--dsw-alias-interactive-bg-hover-solid',
    '--dsw-alias-label-caption', '--dsw-alias-label-dimmed', '--dsw-alias-label-primary',
    '--dsw-alias-label-primary-foreground', '--dsw-alias-label-secondary', '--dsw-alias-label-tertiary',
    '--dsw-alias-state-business-primary', '--dsw-alias-state-error-primary', '--dsw-alias-switch-thumb',
    '--dsw-alias-scrollbar-bg-l2', '--dsw-alias-scrollbar-hover-l2',
    '--dsw-elevation-prominent', '--dsw-elevation-stroke-color', '--dsw-focus-ring-color',
    '--dsw-focus-ring-width', '--dsw-menu-backdrop-filter', '--dsw-radius-lg', '--dsw-radius-md',
    '--dsw-radius-sm', '--dsw-specific-menu'
  ])
  const bad = used.filter((token) => !valid.has(token))
  check('CSS token set', bad.length === 0, bad.join(',') || `${used.length} tokens`)
  const literals = css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) || []
  check('CSS has no literal colors', literals.length === 0, literals.join(','))
  return bad.length === 0 && literals.length === 0
})())
check('mount issues one GET to host settings', fetchCalls.filter((c) => c.method === 'GET' && c.url === '/dsh-translate/settings').length === 1, JSON.stringify(fetchCalls))
check('effects registered with disposers', effects.every((e) => typeof e.disposer === 'function'), String(effects.length))

// flush the mount GET so the host response path runs
await new Promise((resolve) => setTimeout(resolve, 20))
check('no extra requests after mount', fetchCalls.length === 1, JSON.stringify(fetchCalls))
check('localStorage cache key is v4 after host hydration', storage.has('dsh.translate.mode.v4'))
if (storage.has('dsh.translate.mode.v4')) {
  const cached = JSON.parse(storage.get('dsh.translate.mode.v4'))
  check('host values hydrated into cache', cached.source === 'ja' && cached.target === 'fr' && cached.allowSame === false && Array.isArray(cached.custom))
}

console.log('---')
console.log(failures.length === 0 ? 'ALL PASS' : `FAILED: ${failures.join(' | ')}`)
process.exit(failures.length === 0 ? 0 : 1)
