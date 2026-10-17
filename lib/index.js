/**
 * dsh-plugin-translate — Host half.
 *
 * Responsibilities:
 *  - Own the settings store (`<DSH_HOME>/translate-settings.json`) and expose
 *    it to the Web Client over `GET|POST /dsh-translate/settings`.
 *  - Register the `translate_diag` diagnostics tool.
 *
 * The translate agent preset itself is declared by this bundle's
 * `cordis.patch.yml`; its prompt variables come from `lib/preset.js`. This
 * plugin deliberately does not rewrite `agent/pre-step` messages: the persona
 * template reads the live settings through those variables on every assembly.
 */
import { hasStore, readSettings, seedIfMissing, storePath, writeSettings } from './store.js'

const name = 'dsh-translate'
const inject = ['webServer', 'tools']

const MAX_BODY_BYTES = 64 * 1024

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

function reply(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders
  })
  res.end(body === undefined ? undefined : JSON.stringify(body))
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('settings payload too large')
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (raw.trim() === '') return {}
  const value = JSON.parse(raw)
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('settings payload must be a JSON object')
  }
  return value
}

async function diagnose(ctx) {
  const lines = []
  const file = storePath()
  lines.push(`设置文件: ${file}`)
  lines.push(`文件存在: ${hasStore() ? '是' : '否（使用内置默认值）'}`)

  let settings
  try {
    settings = readSettings()
    lines.push(`读取: ${JSON.stringify(settings)}`)
  } catch (error) {
    lines.push(`读取异常: ${messageOf(error)}`)
  }

  try {
    const written = writeSettings(settings || {})
    lines.push(`写回自检: ok -> ${JSON.stringify(written)}`)
  } catch (error) {
    lines.push(`写回自检异常: ${messageOf(error)}`)
  }

  const presets = ctx.get('agentPresets')
  if (!presets) {
    lines.push('agentPresets 服务: 不可用')
  } else {
    try {
      const list = await presets.list()
      lines.push(`预设 roster: ${JSON.stringify(list.map((item) => ({ id: item.id, broken: item.broken ?? null })))}`)
    } catch (error) {
      lines.push(`预设 roster 异常: ${messageOf(error)}`)
    }
    try {
      const resolved = await presets.resolve('translate')
      lines.push(`translate 预设: ${JSON.stringify({ id: resolved.id, name: resolved.name ?? null, broken: resolved.broken ?? null })}`)
    } catch (error) {
      lines.push(`translate 预设解析异常: ${messageOf(error)}`)
    }
    try {
      const inventory = await presets.compositionInventory()
      const row = inventory.find((item) => item.id === 'translate')
      lines.push(
        `translate 组成: ${JSON.stringify(
          row
            ? {
                id: row.id,
                broken: row.broken ?? null,
                rows: row.rows.map((entry) => ({
                  id: entry.entryId,
                  name: entry.moduleName,
                  enabled: entry.enabled,
                  fiber: entry.fiberState
                }))
              }
            : null
        )}`
      )
    } catch (error) {
      lines.push(`translate 组成异常: ${messageOf(error)}`)
    }
  }

  try {
    const origin = ctx.webServer.getOrigin()
    const response = await fetch(`${origin}/dsh-translate/settings`)
    lines.push(`设置路由: ${response.status} ${(await response.text()).slice(0, 300)}`)
  } catch (error) {
    lines.push(`设置路由探测异常: ${messageOf(error)}`)
  }

  return lines.join('\n')
}

function apply(ctx, config) {
  if (config && config.defaults) seedIfMissing(config.defaults)

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: '/dsh-translate/settings',
        handler: async (req, res) => {
          try {
            if (req.method === 'GET' || req.method === 'HEAD') {
              reply(res, 200, readSettings())
              return
            }
            if (req.method === 'POST') {
              const settings = writeSettings(await readJsonBody(req))
              reply(res, 200, { ok: true, settings })
              return
            }
            reply(res, 405, { ok: false, error: 'method not allowed' }, { allow: 'GET, HEAD, POST' })
          } catch (error) {
            ctx.logger.warn('dsh-translate: settings request failed: %s', messageOf(error))
            try {
              reply(res, 500, { ok: false, error: messageOf(error) })
            } catch {
              /* response already committed */
            }
          }
        }
      }),
    'dsh-translate: settings route'
  )

  ctx.effect(
    () =>
      ctx.tools.register({
        name: 'translate_diag',
        description:
          '诊断翻译模式插件：设置文件的读取与写回、translate 预设的激活/组成状态、设置路由可达性。',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
        output: {
          schema: { type: 'string' },
          render: (args, value) => [
            { type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }
          ]
        },
        execute: async () => diagnose(ctx)
      }),
    'dsh-translate: diagnostics tool'
  )
}

export { apply, inject, name }
