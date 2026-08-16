// dsh-translate i18n 自测：从 plugin/client.js 提取 DICTS（与线上完全一致），
// 复刻 dsh-client-locale LocaleRuntime.lookup/translate 逻辑，
// 对 18 种语言 × 全部键做断言。
// 运行：node i18n-self-test.mjs
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('./plugin/client.js', import.meta.url), 'utf8');
const match = src.match(/const DICTS = (\{[\s\S]*?\n\});/);
if (!match) {
  console.error('无法从 plugin/client.js 提取 DICTS');
  process.exit(1);
}
// 纯对象字面量，eval 安全
const DICTS = eval('(' + match[1] + ')');

const KEYS = ['auto', 'searchPlaceholder', 'sourceTitle', 'targetTitle', 'addTitle', 'deleteTitle', 'styleButton', 'styleTitle', 'styleHint', 'stylePlaceholder', 'swapTitle', 'settingsTitle', 'prefSource', 'prefTarget', 'allowSame', 'allowSameHint', 'stylePresetsTitle', 'savePreset', 'presetNamePlaceholder', 'applyPreset', 'deletePreset', 'noPresets', 'editPreset', 'saveChanges', 'clearAllPresets'];
const LANGS = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt', 'it', 'ar', 'hi', 'th', 'vi', 'nl', 'pl', 'tr', 'uk'];

function lookup(active, key) {
  return DICTS[active]?.[key] ?? DICTS['zh']?.[key] ?? key;
}

let failures = 0;
const rows = [];
for (const loc of LANGS) {
  const missing = [];
  const leaked = [];
  for (const key of KEYS) {
    const v = lookup(loc, key);
    if (v === undefined || v === '') missing.push(key);
    else if (v === key) leaked.push(key);
    else if (loc !== 'zh' && v === DICTS['zh'][key]) leaked.push(key + '(zh回退)');
  }
  const ok = missing.length === 0 && leaked.length === 0;
  if (!ok) failures += 1;
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${loc.padEnd(3)} ${ok ? '' : '缺:' + missing.join(',') + ' 泄漏:' + leaked.join(',')}`);
}
console.log(rows.join('\n'));
console.log('---');
console.log('样例: ja.swapTitle =', lookup('ja', 'swapTitle'), '| en.swapTitle =', lookup('en', 'swapTitle'), '| uk.auto =', lookup('uk', 'auto'));
console.log(failures === 0 ? `ALL PASS (${LANGS.length} locales x ${KEYS.length} keys)` : failures + ' LOCALES FAILED');
process.exit(failures === 0 ? 0 : 1);
