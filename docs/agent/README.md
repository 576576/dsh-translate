# dsh-translate 维护说明

面向 agent 与维护者。用户功能与安装说明见仓库根目录 [README.md](../../README.md)。

## 仓库即 bundle 包

仓库根目录本身就是一个 DSH bundle，用 `plugin_manager` 的 `install_bundle` 以本地目录安装（target 为本目录）。安装后 profile 以 `link:` 指向本目录：

- 只改客户端半体（`lib/client.js`）：刷新页面即可；
- 改 Host 半体（`lib/index.js`、`lib/store.js`、`lib/languages.js`、`lib/preset.js`）或 `cordis.patch.yml`：需重启应用加载新的模块代次。

## 目录结构

| 路径 | 作用 |
|---|---|
| `package.json` | bundle 清单：`dsh.bundle.patch`、`dsh.client`（platform/immediately/inject）、`exports`、`files` |
| `cordis.patch.yml` | 插入宿主行 `dsh-translate` 与预设行 `preset-translate` |
| `lib/index.js` | 宿主半体：设置存储路由 `GET/POST /dsh-translate/settings`、`translate_diag` 诊断工具 |
| `lib/preset.js` | 预设作用域内的 prompt 变量提供者 |
| `lib/store.js` | 唯一持久层（原子写、默认值合并、旧文件迁移） |
| `lib/languages.js` | 语言标签与 `target=auto` 的规则渲染 |
| `lib/client.js` | 客户端半体（`__ModuleLoader__` 预构建；输入框工具行 + 设置页两处 slot 注册） |
| `locale/*.json` | 插件管理页元数据，文件名 = 客户端界面语言 id |
| `icon.png` | 插件图标，由 `exports["./icon"]` 指向 |
| `test/` | i18n 自测 + 宿主/客户端 stub 冒烟测试 |

## 设置存储

唯一事实来源：`<DSH_HOME>/translate-settings.json`（`DSH_HOME` 取 `process.env.DSH_HOME`，缺失回退 `~/.dsh`）。

```json
{
  "source": "auto",
  "target": "auto",
  "style": "",
  "allowSame": true,
  "custom": [],
  "stylePresets": [],
  "uiLocale": "zh"
}
```

- 写入为临时文件 + rename 原子替换；读取时合并默认值并丢弃畸形条目。
- 客户端通过 `GET/POST /dsh-translate/settings` 读写；localStorage（键 `dsh.translate.mode.v4`）只作首屏缓存。
- `uiLocale` 由客户端上报（`ctx.locale.getSnapshot().active`），界面语言变化时重新 POST。
- 旧文件迁移：没有 `uiLocale` 字段且 `target` 仍是旧默认值 `en` 的文件一次性迁移为 `auto`；显式选过其它语言的保持不变。

## 预设

`preset-translate` 声明 `id: translate`，挂载两个行：

1. `@deepseek-ai/dsh-persona` —— 翻译器人格；`prefix` 用 `{{translatesource}}` 等变量插值，`includeRuntimeContext: false` 关闭运行时上下文。
2. `dsh-plugin-translate/preset` —— 在预设作用域内注册 `translatesource` / `translatetarget` / `translatestyle`，每次组装系统提示词时从设置文件读取。

预设声明变更只对新会话生效；已存在的会话保留其启动时的 preset revision。

## 目标语言 auto 的渲染

`lib/languages.js` 的 `describeTarget()` 把规则渲染成一句提示词：

- 界面语言 `zh`：`自动：原文不是中文时译为中文；原文是中文时译为英语`
- 界面语言 `en`：`自动：原文不是英语时译为英语；原文是英语时译为中文`
- 其它界面语言：译为该语言，原文已是该语言时译为英语
- 界面语言未知时按中文处理

## 图标与本地化资源

- `icon.png`：512×512 透明 PNG，需 ≤ 256 KiB（宿主图标限制）。
- 图标来源为用户提供的 Codex 生成插画，透明底由本地脚本处理：背景是暖奶油色（B ≤ 241），白色织物（围裙/头纱/袖口）B ≥ 242 因而保留；呆毛与头饰之间的封闭背景按种子移除；边缘做 alpha 羽化与颜色去污染。
- `locale/<id>.json` 的 `<id>` 必须与客户端 `DICTS` 的语言 id 一致：`zh en ja ko fr de es ru pt it ar hi th vi nl pl tr uk`。每个文件包含 `meta.title` 与 `meta.description`；缺文件会让 i18n 自测失败。

## 测试

```
npm test                              # 以下全部
node test/i18n-self-test.mjs          # 18 语言 × 全部字典键 + 18 个 inventory locale 文件
node test/smoke-host.mjs              # 宿主半体：默认值/迁移/路由/prompt 变量/auto 规则
node test/smoke-client.mjs            # 客户端半体：模块执行/槽位注册/label/主题令牌/持久化
```

i18n 测试直接从 `lib/client.js` 提取 `DICTS` 字面量，不维护第二份字典副本。

## 验证安装后的能力

- `plugin_manager list_plugins`：`dsh-translate` 与 `preset-translate` 两行均为 active。
- `translate_diag` 工具：设置文件读写、预设 roster、`translate` 预设组成、设置路由可达性。
- `cordis_inspect_query` `Slots.listSubTree`：`conversation.input.right` 与 `settings.section` 两个 occupant。
- 无浏览器控制时，客户端行为用 `test/smoke-client.mjs` 的 stub 运行时覆盖。

## 历史与迁移

v1 的 `agent-preset/`、`local-plugin/`、`plugin/` 布局已删除：DSH 0.2.x 不再读取目录式 agent 预设，动态/本地插件挂载方式也已由 bundle 取代。旧实现见 git 历史。
