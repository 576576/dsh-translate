// Localization self-test: reads the client bundle's `DICTS` literal directly,
// so the check can never drift from the shipped dictionaries. Validates that
// every locale exists, carries exactly the same key set as zh, has no empty
// values, never shows a raw key, and never falls back to the zh text.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const file = fileURLToPath(new URL('../lib/client.js', import.meta.url))
const code = readFileSync(file, 'utf8')

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
console.log(
  `样例: ja.auto = ${DICTS.ja.auto} | uk.searchPlaceholder = ${DICTS.uk.searchPlaceholder.slice(0, 28)}… | en.styleButton = ${DICTS.en.styleButton} | zh.autoTarget = ${DICTS.zh.autoTarget}`
)
console.log(failures === 0 ? `ALL PASS (${LANGS.length} locales × ${KEYS.length} keys)` : `${failures} LOCALES FAILED`)
process.exit(failures === 0 ? 0 : 1)
