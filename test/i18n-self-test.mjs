// Localization self-test.
//
// 1. Reads the client bundle's `DICTS` literal directly, so the UI-text check
//    can never drift from the shipped dictionaries.
// 2. Checks the plugin-inventory locale resources (`locale/<id>.json`) cover
//    every client locale and carry non-empty `meta.title` / `meta.description`.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const clientFile = fileURLToPath(new URL('../lib/client.js', import.meta.url))
const localeDir = fileURLToPath(new URL('../locale/', import.meta.url))
const code = readFileSync(clientFile, 'utf8')

const start = code.indexOf('const DICTS = {')
if (start < 0) throw new Error('DICTS block not found in lib/client.js')
const open = code.indexOf('{', start)
let depth = 0
let end = -1
let quote = null
for (let i = open; i < code.length; i += 1) {
  const ch = code[i]
  if (quote) {
    if (ch === '\\') i += 1
    else if (ch === quote) quote = null
    continue
  }
  if (ch === "'" || ch === '"' || ch === '`') {
    quote = ch
    continue
  }
  if (ch === '{') depth += 1
  else if (ch === '}') {
    depth -= 1
    if (depth === 0) {
      end = i
      break
    }
  }
}
if (end < 0) throw new Error('unterminated DICTS literal')

const DICTS = new Function(`return (${code.slice(open, end + 1)})`)()

const LANGS = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt', 'it', 'ar', 'hi', 'th', 'vi', 'nl', 'pl', 'tr', 'uk']
const KEYS = Object.keys(DICTS.zh)

let failures = 0
const rows = []
for (const id of LANGS) {
  const dict = DICTS[id]
  if (!dict) {
    failures += 1
    rows.push(`FAIL  ${id.padEnd(3)} missing dictionary`)
    continue
  }
  const keys = Object.keys(dict)
  const missing = KEYS.filter((key) => typeof dict[key] !== 'string' || dict[key] === '')
  const extra = keys.filter((key) => !KEYS.includes(key))
  const leaked = KEYS.filter((key) => dict[key] === key || (id !== 'zh' && dict[key] === DICTS.zh[key]))
  const ok = missing.length === 0 && extra.length === 0 && leaked.length === 0
  if (!ok) failures += 1
  rows.push(
    `${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(3)} ${
      ok ? '' : `缺:${missing.join(',')} 多:${extra.join(',')} 泄漏:${leaked.join(',')}`
    }`
  )
}

console.log(rows.join('\n'))
console.log('---')

// Plugin-inventory locale resources.
const files = readdirSync(localeDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -5))
  .sort()
const missingFiles = LANGS.filter((id) => !files.includes(id))
const extraFiles = files.filter((id) => !LANGS.includes(id))
for (const id of LANGS) {
  if (!files.includes(id)) continue
  const body = JSON.parse(readFileSync(join(localeDir, `${id}.json`), 'utf8'))
  const ok = Boolean(body && body.meta && typeof body.meta.title === 'string' && body.meta.title !== '' &&
    typeof body.meta.description === 'string' && body.meta.description !== '')
  if (!ok) {
    failures += 1
    console.log(`FAIL  ${id.padEnd(3)} inventory locale lacks meta.title / meta.description`)
  }
}
const inventoryOk = missingFiles.length === 0 && extraFiles.length === 0
if (!inventoryOk) failures += 1
console.log(
  `${inventoryOk ? 'PASS' : 'FAIL'}  locale  inventory files: ${files.length}/${LANGS.length}` +
    (inventoryOk ? '' : ` 缺:${missingFiles.join(',')} 多:${extraFiles.join(',')}`)
)

console.log('---')
console.log(
  `样例: ja.auto = ${DICTS.ja.auto} | uk.searchPlaceholder = ${DICTS.uk.searchPlaceholder.slice(0, 28)}… | en.styleButton = ${DICTS.en.styleButton} | zh.autoTarget = ${DICTS.zh.autoTarget}`
)
console.log(
  failures === 0
    ? `ALL PASS (${LANGS.length} locales × ${KEYS.length} keys, ${files.length} inventory locales)`
    : `${failures} CHECKS FAILED`
)
process.exit(failures === 0 ? 0 : 1)
