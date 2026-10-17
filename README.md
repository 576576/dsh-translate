# dsh-translate — DeepSeek Harness 翻译模式

为 [DeepSeek Harness](https://github.com/deepseek-ai)（Web UI 与桌面版通用）添加「翻译模式」：一个只返回译文的 Agent 预设，以及输入框工具行上的语言方向与风格控件。以标准 DSH **bundle** 形式分发，面向 `0.2.1-rc.2` 的 bundle + preset declaration 规范。

## 功能

- **翻译模式预设**：新建会话时选择「翻译模式」，模型仅输出译文（不加解释/引号/围栏，保留原文格式），并关闭 runtime context。
- **工具行控件**（仅翻译模式会话显示）：`[源语言▾] [⇄] [目标语言▾] [风格设置▾]`，与原生模型/权限选择器同款——8px 圆角、28px 高、原生 hover 与焦点环、原生 SVG 图标。
- **语言菜单**：在触发器正上方弹出（目标语言右对齐，避免溢出窗口），带搜索框与自定义语言（`+` 添加、可删除），选中项右侧对勾；「允许源与目标同语言」关闭时两个菜单互相排除。
- **目标语言 `auto`（默认）**：按句解析，见下节。
- **风格菜单**：与语言菜单同款浮层卡，从「风格设置」触发器上方弹出；文本域自动保存（300ms 防抖），风格预设可保存/应用/删除。
- **设置页「翻译模式」**（设置 → 翻译模式）：优先源/目标语言、允许同语言开关、风格预设管理，行样式对齐原生 preference row。
- **持久化**：唯一事实来源是 `<DSH_HOME>/translate-settings.json`；localStorage 只作首屏缓存。
- **i18n**：18 种界面语言的界面文案（含新增 `autoTarget`），随界面语言即时切换。

## 目标语言 `auto`

源语言与目标语言都默认 `auto`。目标语言为 `auto` 时逐句判定：

| 原文语言 | 界面语言 | 译为 |
|---|---|---|
| ≠ 界面语言 | 任意 | **界面语言** |
| = 界面语言 | ≠ 英语 | **英语** |
| = 英语 | 英语 | **中文** |

规则由 `lib/languages.js` 的 `describeTarget()` 渲染成一句提示词，随 `{{translatetarget}}` 注入人格；界面语言由客户端上报为 `uiLocale`，切换界面语言会自动同步，改动对下一条消息生效。

## 安装

本仓库就是 bundle 包，用插件管理器安装（不要手工写 profile 的 `package.json` 或 `cordis.patch.yml`）：

```
plugin_manager({ action: "install_bundle", target: "<本仓库绝对路径>" })
```

安装后「设置 → 插件」会出现「翻译模式」条目（带图标与描述）；新建会话即可在预设选择器中选择「翻译模式」。开发时 profile 以 `link:` 指向本目录，修改 Host 半体后需重启应用加载新的模块代次，客户端半体刷新页面即可。

> v1 的 `agent-preset/`、`local-plugin/`、`plugin/` 三种手工安装方式已移除（旧版目录预设不再被 DSH 读取），完整实现见 git 历史。

## 目录结构

```
package.json          bundle 清单：dsh.bundle.patch + dsh.client + exports/files
cordis.patch.yml      插入宿主行 dsh-translate 与预设行 preset-translate
lib/index.js          宿主半体：设置存储路由（GET/POST /dsh-translate/settings）、translate_diag
lib/preset.js         预设作用域内的 prompt 变量提供者（translatesource/translatetarget/translatestyle）
lib/store.js          唯一持久层：<DSH_HOME>/translate-settings.json（原子写、默认值合并、旧文件迁移）
lib/languages.js      语言标签与 target=auto 的规则渲染
lib/client.js         客户端半体（__ModuleLoader__ 预构建；输入框工具行 + 设置页两处 slot 注册）
locale/{en,zh}.json   插件管理页标题与描述
icon.svg              插件图标
test/                 i18n 自测 + 宿主/客户端 stub 冒烟测试
```

## 设置存储

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

- 浏览器通过 `GET/POST /dsh-translate/settings` 读写；localStorage 只作首屏缓存。
- `DSH_HOME` 取 `process.env.DSH_HOME`，缺失时回退 `~/.dsh`。
- `uiLocale` 是客户端上报的当前界面语言，只在 `target` 为 `auto` 时参与规则渲染。
- 旧版 `{source,target,style}` 文件可直接沿用：缺失字段补默认值；没有 `uiLocale` 且 `target` 仍是旧默认值 `en` 的文件会一次性迁移为 `auto`，显式选过其它语言的保持不变。

## 预设

`preset-translate` 声明 `id: translate`，挂载两个行：

1. `@deepseek-ai/dsh-persona` —— 翻译器人格；`prefix` 用 `{{translatesource}}` 等变量插值，`includeRuntimeContext: false` 关闭运行时上下文。
2. `dsh-plugin-translate/preset` —— 在预设作用域内注册上述变量，每次组装系统提示词时从设置文件读取，因此改设置对下一条消息立即生效。

> 预设声明变更只对新会话生效；已存在的会话保留其启动时的预设 revision。

## 测试

```powershell
node test/i18n-self-test.mjs   # 18 语言 × 全部字典键（DICTS 直接从 bundle 提取，不会与实现漂移）
node test/smoke-host.mjs       # 宿主半体：默认值/迁移/路由/prompt 变量/auto 规则
node test/smoke-client.mjs     # 客户端半体：模块执行/槽位注册/label/主题令牌/持久化
npm test                       # 以上全部
```

## License

MIT（LICENSE 文件，作者 576576）
