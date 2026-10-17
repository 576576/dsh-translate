/**
 * dsh-plugin-translate — preset-scoped prompt-variable provider.
 *
 * Mounted inside the `translate` agent preset (row `translate-settings`), so
 * these variables only exist for Agents composed from that preset. The persona
 * row in the same preset interpolates them into its prefix, which is
 * re-assembled for every model request: a settings change is picked up by the
 * next message without touching the session log.
 *
 * Variable names must match `[a-z][a-z0-9_]*`; the persona template uses the
 * same names.
 */
import { describeTarget, sourceLabel } from './languages.js'
import { readSettings } from './store.js'

const name = 'translate-settings'
const inject = ['systemPrompt']

const DEFAULT_STYLE = '自然、忠实、通顺'

function apply(ctx) {
  ctx.effect(
    () => ctx.systemPrompt.variable('translatesource', () => sourceLabel(readSettings().source)),
    'translate-settings: source variable'
  )
  ctx.effect(
    () => ctx.systemPrompt.variable('translatetarget', () => describeTarget(readSettings())),
    'translate-settings: target variable'
  )
  ctx.effect(
    () => ctx.systemPrompt.variable('translatestyle', () => readSettings().style.trim() || DEFAULT_STYLE),
    'translate-settings: style variable'
  )
}

export { apply, inject, name }
