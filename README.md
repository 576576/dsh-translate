# dsh-translate — DeepSeek Harness 翻译模式

为 [DeepSeek Harness](https://github.com/deepseek-ai)（WebUI 与桌面版通用）添加「翻译模式」：与标准模式/创造模式并列的 Agent 预设——**发送原文，模型只返回译文**。

## 功能

- **翻译模式预设**：新建会话时在预设选择器中选择「翻译模式」，模型仅输出译文（不加解释/引号/围栏，保留格式），并关闭 runtime context
- **对话框内控件**（仅翻译模式会话显示，风格与权限/模型选择器一致）：
  - `[源语言▾] [⇄] [目标语言▾] [风格设置]`
  - 源语言默认「自动检测」（Auto），自动检测时交换按钮禁用
  - 语言菜单：搜索框 + 自定义语言键入（加号添加到源与目标选择范围，自定义语言可删除），选中行持久高亮
  - 交换按钮提示按源语言本地化（Swap languages / 言語を交換 …），自定义语言回退英文
- **风格设置面板**：输入框左上锚点就地展开，与加号/斜杠菜单天然互斥，点击输入框不收回、开始键入即收回，修改自动保存并**全局生效**（写入 `<DSH_HOME>/translate-settings.json`，所有翻译模式会话即时采用）
- **风格预设**：在风格面板或设置页中把当前风格「保存为预设」（同名覆盖），一键「应用」加载，可删除；预设列表全局共享（localStorage）
- **设置页「翻译模式」**（设置 → 翻译模式）：首选项源/目标语言、允许源和目标语言相同（关闭后源与目标菜单互相排除，已有相同组合自动纠正为自动检测）、风格预设管理
- **变更同步**：更改语言/风格后发送消息时，会话自动插入「翻译设置」上下文，模型与对话记录同步得知变更
- **i18n**：界面文案字典覆盖插件列出的全部 18 种语言（未命中回退中文），随界面语言即时切换

## 安装

### 1. Agent 预设

将 `agent-preset/` 目录复制为用户级预设：

```powershell
Copy-Item -Recurse .\agent-preset "$env:USERPROFILE\.dsh\.agent-presets\translate"
```

新建会话 → 预设选择器 → 「翻译模式」。

### 2. 本地插件（设置 → 插件）

将 `local-plugin/` 复制为用户级本地插件（`profiles/node_modules` 是所有 profile 共享的扁平模块目录，WebUI 与桌面版都从这里解析）：

```powershell
Copy-Item -Recurse .\local-plugin "$env:USERPROFILE\.dsh\profiles\node_modules\dsh-plugin-translate"
```

在用户级补丁 `$env:USERPROFILE\.dsh\cordis.patch.yml` 追加（home 级补丁对所有 profile 生效，无需区分 WebUI / 桌面版；文件不存在则新建）：

```yaml
- insert:
    - id: dsh-translate
      name: dsh-plugin-translate
```

**重启 Harness（WebUI 或桌面版均可）**。之后 设置 → 插件 中出现 `dsh-plugin-translate`，翻译模式会话的输入框工具行即出现语言控件与「风格设置」。

> 备选：动态插件方式（无需重启）。在「创造模式」会话中，用 `cordis_define` 定义动态插件：
>
> - `code.host` ← `plugin/host.js` 内容
> - `code.client` ← `plugin/client.js` 内容
> - 插件对象 `inject: ['slots', 'locale']`

## 目录结构

```
agent-preset/           翻译模式 Agent 预设（可直接复制到 ~/.dsh/.agent-presets/）
  preset.yml            预设元数据（名称/描述/排序）
  agent.cordis.yml      组合：persona（只返回译文）+ lib/settings.js（设置变量注入）
  lib/settings.js       每次组装提示词时读取 translate-settings.json 注入 persona 变量
plugin/
  host.js               动态插件宿主端（saveSettings RPC、设置变更通告、translate_diag）
  client.js             动态插件浏览器端（工具行控件、语言菜单、风格面板、18 语字典）
local-plugin/           静态本地包（设置 → 插件 安装方式，WebUI 与桌面版通用；与 plugin/ 同源实现）
  package.json          dsh.client 声明（platform: web）、exports ./client
  lib/index.js          宿主端：/dsh-translate/settings 路由、pre-step 通告、translate_diag
  lib/client.js         浏览器端：__ModuleLoader__ 打包格式（require('react')、slots.inject）
i18n-self-test.mjs      本地化自测：18 语言 × 22 键全量断言（node i18n-self-test.mjs）
```

## 工作原理

1. 预设 persona 声明翻译模式行为；`lib/settings.js` 注册 `{{translatesource}}/{{translatetarget}}/{{translatestyle}}` 变量，每次组装时读取 `<DSH_HOME>/translate-settings.json`
2. 控件改动经宿主端持久化（动态插件：`saveSettings` RPC；本地插件：`POST /dsh-translate/settings`）写入共享设置文件（显式 workspace-write 沙箱策略）
3. 宿主端 `agent/pre-step` 拦截：设置变更后，首条用户消息前插入「翻译设置」上下文（内存配置，无文件竞态，去重通告）

## 自测

```powershell
node i18n-self-test.mjs
```

## License

MIT（LICENSE 文件，作者 576576）
