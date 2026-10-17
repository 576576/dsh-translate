/**
 * Language labels shared by the preset-scoped prompt-variable provider.
 * Custom languages are typed by the user, so unknown codes fall back to the
 * code itself instead of disappearing.
 */
export const LANG_LABELS = Object.freeze({
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  ru: 'Русский',
  pt: 'Português',
  it: 'Italiano',
  ar: 'العربية',
  hi: 'हिन्दी',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  nl: 'Nederlands',
  pl: 'Polski',
  tr: 'Türkçe',
  uk: 'Українська'
})

/** Display label for a concrete language code. */
export function labelFor(code) {
  if (typeof code !== 'string' || code === '') return ''
  return LANG_LABELS[code] || code
}

/** Display label for the source language, where `auto` means detection. */
export function sourceLabel(code) {
  if (typeof code !== 'string' || code === '' || code === 'auto') return '自动检测'
  return labelFor(code)
}

/**
 * Prompt-facing description of the target language.
 *
 * A concrete language renders its label. `auto` renders the per-sentence rule
 * the model must apply:
 *   - source is not the UI language  → the UI language
 *   - source is the UI language      → English (or Chinese when the UI is English)
 *
 * The UI language comes from the browser's active locale, reported with the
 * settings payload; without one we assume Chinese.
 */
export function describeTarget(settings) {
  const raw = settings && typeof settings === 'object' ? settings : {}
  const target = typeof raw.target === 'string' && raw.target !== '' ? raw.target : 'auto'
  if (target !== 'auto') return labelFor(target) || target

  const uiLocale = typeof raw.uiLocale === 'string' && raw.uiLocale !== '' ? raw.uiLocale : 'zh'
  if (uiLocale === 'en') return '自动：原文不是英语时译为英语；原文是英语时译为中文'
  const uiLabel = labelFor(uiLocale) || uiLocale
  return `自动：原文不是${uiLabel}时译为${uiLabel}；原文是${uiLabel}时译为英语`
}
