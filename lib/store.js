/**
 * dsh-plugin-translate — settings store.
 *
 * `<DSH_HOME>/translate-settings.json` is the only persistent copy of the
 * plugin's user settings: the Host half writes it from the browser route, and
 * the preset-scoped prompt-variable provider reads it on every prompt
 * assembly. The browser keeps a first-paint cache in localStorage only.
 *
 * DSH_HOME resolution mirrors the rest of the Harness: the environment
 * variable when the process was launched with one, `<home>/.dsh` otherwise.
 */
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/**
 * Built-in defaults; a missing or unreadable file means exactly these values.
 * `target: 'auto'` resolves per sentence: translate into the UI language, or
 * into English / Chinese when the source already is the UI language.
 */
export const DEFAULT_SETTINGS = Object.freeze({
  source: 'auto',
  target: 'auto',
  style: '',
  allowSame: true,
  custom: [],
  stylePresets: [],
  uiLocale: ''
})

/** Resolve DSH_HOME without depending on an optional Host service. */
export function dshHome() {
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv
  return join(homedir(), '.dsh')
}

/** Absolute path of the settings file. */
export function storePath() {
  return join(dshHome(), 'translate-settings.json')
}

function asString(value, fallback) {
  return typeof value === 'string' ? value : fallback
}

/**
 * Coerce arbitrary input into the complete settings shape, dropping unknown
 * fields and malformed list entries so a hand-edited file cannot break the UI.
 */
export function normalize(input) {
  const raw = input && typeof input === 'object' ? input : {}
  const source = asString(raw.source, DEFAULT_SETTINGS.source) || DEFAULT_SETTINGS.source
  const target = asString(raw.target, DEFAULT_SETTINGS.target) || DEFAULT_SETTINGS.target
  const style = asString(raw.style, DEFAULT_SETTINGS.style)
  const allowSame = typeof raw.allowSame === 'boolean' ? raw.allowSame : DEFAULT_SETTINGS.allowSame
  const custom = Array.isArray(raw.custom)
    ? raw.custom
        .filter((item) => item && typeof item.code === 'string' && typeof item.label === 'string')
        .map((item) => ({ code: item.code, label: item.label }))
    : []
  const stylePresets = Array.isArray(raw.stylePresets)
    ? raw.stylePresets
        .filter(
          (item) =>
            item &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.style === 'string'
        )
        .map((item) => ({ id: item.id, name: item.name, style: item.style }))
    : []
  // The browser reports its active UI language so `target: 'auto'` can render
  // the resolution rule into the preset prompt.
  const uiLocale = asString(raw.uiLocale, '')
  return { source, target, style, allowSame, custom, stylePresets, uiLocale }
}

/**
 * Pre-2.1 files predate the `auto` target and the `uiLocale` field; the old
 * default target was English, so an untouched file is upgraded to `auto`
 * (explicit languages other than the old default are preserved).
 */
function migrate(raw, settings) {
  const hasUiLocale = raw !== null && typeof raw === 'object' && 'uiLocale' in raw
  if (!hasUiLocale && settings.target === 'en') settings.target = DEFAULT_SETTINGS.target
  return settings
}

/** Read the current settings; never throws. */
export function readSettings() {
  try {
    const raw = JSON.parse(readFileSync(storePath(), 'utf8'))
    return migrate(raw, normalize(raw))
  } catch {
    return normalize({})
  }
}

/** True when a settings file already exists. */
export function hasStore() {
  try {
    readFileSync(storePath(), 'utf8')
    return true
  } catch {
    return false
  }
}

/**
 * Merge a partial patch into the stored settings and persist it atomically
 * (write to a sibling temp file, then rename over the target).
 */
export function writeSettings(patch) {
  const next = normalize({ ...readSettings(), ...(patch && typeof patch === 'object' ? patch : {}) })
  const file = storePath()
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  try {
    renameSync(tmp, file)
  } catch (error) {
    rmSync(tmp, { force: true })
    throw error
  }
  return next
}

/** Seed the store from row `config.defaults` only when no file exists yet. */
export function seedIfMissing(defaults) {
  if (!defaults || typeof defaults !== 'object' || hasStore()) return undefined
  try {
    return writeSettings(defaults)
  } catch {
    return undefined
  }
}
