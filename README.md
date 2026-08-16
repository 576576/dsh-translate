# dsh-translate — DeepSeek Harness 翻译模式

为 [DeepSeek Harness](https://github.com/deepseek-ai) 桌面端添加「翻译模式」：与标准模式/创造模式并列的 Agent 预设——**发送原文，模型只返回译文**。

## 功能

- **翻译模式预设**：新建会话时在预设选择器中选择「翻译模式」，模型仅输出译文（不加解释/引号/围栏，保留格式），并关闭 runtime context
- **对话框内控件**（仅翻译模式会话显示，风格与权限/模型选择器一致）：
  - `[源语言▾] [⇄] [目标语言▾] [风格设置]`
  - 源语言默认「自动检测」（Auto），自动检测时交换按钮禁用
  - 语言菜单：搜索框 + 自定义语言键入（加号添加到源与目标选择范围，自定义语言可删除），选中行持久高亮
  - 交换按钮提示按源语言本地化（Swap languages / 言語を交換 …），自定义语言回退英文
- **风格设置面板**：输入框左上锚点就地展开，与加号/斜杠菜单天然互斥，点击输入框不收回、开始键入即收回，修改自动保存并**全局生效**（写入 `<DSH_HOME>/translate-settings.json`，所有翻译模式会话即时采用）
- **变更同步**：更改语言/风格后发送消息时，会话自动插入「翻译设置」上下文，模型与对话记录同步得知变更
- **i18n**：界面文案字典覆盖插件列出的全部 18 种语言（未命中回退中文），随界面语言即时切换

## 安装

### 1. Agent 预设

将 `agent-preset/` 目录复制为用户级预设：

```powershell
Copy-Item -Recurse .\agent-preset "$env:USERPROFILE\.dsh\.agent-presets\translate"
```

新建会话 → 预设选择器 → 「翻译模式」。

### 2. 动态插件（控件）

在「创造模式」会话中，用 `cordis_define` 定义动态插件：

- `code.host` ← `plugin/host.js` 内容
- `code.client` ← `plugin/client.js` 内容
- 插件对象 `inject: ['slots', 'locale']`

激活后，翻译模式会话的输入框工具行即出现语言控件与「风格设置」。

## 目录结构

```
agent-preset/           翻译模式 Agent 预设（可直接复制到 ~/.dsh/.agent-presets/）
  preset.yml            预设元数据（名称/描述/排序）
  agent.cordis.yml      组合：persona（只返回译文）+ lib/settings.js（设置变量注入）
  lib/settings.js       每次组装提示词时读取 translate-settings.json 注入 persona 变量
plugin/
  host.js               动态插件宿主端（saveSettings RPC、设置变更通告、translate_diag）
  client.js             动态插件浏览器端（工具行控件、语言菜单、风格面板、18 语字典）
i18n-self-test.mjs      本地化自测：18 语言 × 10 键全量断言（node i18n-self-test.mjs）
```

## 工作原理

1. 预设 persona 声明翻译模式行为；`lib/settings.js` 注册 `{{translatesource}}/{{translatetarget}}/{{translatestyle}}` 变量，每次组装时读取 `<DSH_HOME>/translate-settings.json`
2. 控件改动经 `saveSettings` RPC 写入共享设置文件（显式 workspace-write 沙箱策略）
3. 宿主端 `agent/pre-step` 拦截：设置变更后，首条用户消息前插入「翻译设置」上下文（内存配置，无文件竞态，去重通告）

## 自测

```powershell
node i18n-self-test.mjs
```

## License

MIT（尚未添加 LICENSE 文件，如需请告知）
