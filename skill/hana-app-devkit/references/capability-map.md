# Hana App 接口与能力对照表（任务导向）

> **用法**：带着"我要做 X"来查。查到后照抄能力词与 SDK 方法，别再翻源码。
> **权威依据**：`api-capabilities.md`（本目录，70 能力词全表）+ 官方 `hana-app-creator` skill。冲突时以官方为准。
> **标注约定**：能力词 = manifest 里 `permissions` 要写的；SDK 方法 = 代码里调的。所有方法名都已核对源码。

---

## 速查：我想做的事 → 去哪查

| 我想… | 跳转 | 关键能力词 |
|---|---|---|
| 让 AI 在对话里调用我的功能 | [A1](#a1-把功能暴露给-ai-调用) | `app/tools.expose-to-model` |
| 给用户一个能点的界面 | [A2](#a2-做一个能点的界面卡片) | `app/ui.*` |
| 存点数据（配置/KV） | [A3](#a3-存数据) | 无（storage 不需能力词） |
| 读写文件 | [A4](#a4-读写文件) | `app/resources.read/write` |
| 起子进程（跑命令行） | [A5](#a5-起子进程跑命令行) | `app/process.spawn` |
| 联网请求 | [A6](#a6-联网请求) | `contributes.network` |
| 发系统通知 | [A7](#a7-发通知) | `app/notifications.show` |
| 改会话（读/写消息、拦截） | [A8](#a8-参与会话与拦截) | `app/hooks.*` `app/session.*` |
| 开自己的后端路由 | [A9](#a9-开后端路由) | 无 |
| 开一个原生窗口 | [A10](#a10-开原生窗口) | `app/windows.manage` |
| 显示自定义输入面板 | [A11](#a11-显示自定义输入面板) | `app/input.panels` |
| 做卡片 / 用主题变量 | [B1](#b1-卡片与主题) | 无（读 card-guide） |
| 打包 / 发布 App | [C1](#c1-打包与发布) | 无 |
| 找 Hana 本体的开发资源 | [D](#d-hana-本体补充官方-skill-没写但开发常用) | 见各条 |

---

## A. 功能能力（服务端 `defineApp(async sdk => ...)`）

### A1. 把功能暴露给 AI 调用

**能力词**：`app/tools.expose-to-model`（默认拒绝；撤销后下次调用即生效）

**SDK**：
```js
sdk.tools.register({
  name: "my_tool",
  description: "这个工具做什么（AI 靠它决定何时调）",
  parameters: { type: "object", properties: { q: { type: "string" } }, required: ["q"] },
  async execute(args, ctx) { return { ok: true, result: "..." }; },
});
```
- `execute` 收到 `{...args, context:{sessionPath, messageId, messageText, callToken?, document?}}`
- 注册返回 `AppRegistration`：`dispose()` / `ready` / `disposeAsync()`
- 读宿主工具目录：`sdk.tools.list({scope:"all"})` 需 `app/tools.read`；`listOwn()` 不用

**坑**：只在 `contributes` 或 `sdk.tools.register` 里注册还不够，**必须同时声明 `app/tools.expose-to-model`**，否则工具不进模型循环（静默不生效）。

### A2. 做一个能点的界面卡片

**能力词**：按需 `app/ui.clipboard-write`（复制）、`app/ui.open-external`（开外链）

**SDK（在 `ui/` 页面里，`hana.*`）**：
| 我要 | 方法 |
|---|---|
| 就绪握手 | `await hana.ready()` |
| 调本 App 后端 | `hana.api.fetch('/path')` |
| 读写卡实例态（≤64KB，草稿纸） | `hana.state.get(key)` / `hana.state.set(key, value)` |
| 宿主原语面板 | `hana.panel.set({sections, refresh})` + `hana.panel.onEvent(cb)` |
| 请求调尺寸 | `hana.ui.resize({width})`（受宿主分配上限约束） |
| 拿布局信封 | `hana.envelope` |
| 主题 | `hana.theme` |
| toast / 复制 / 开外链 | `hana.toast.show` / `hana.clipboard.writeText` / `hana.external.open` |
| 资源 | `hana.resources.open/pick/saveFile/requestAccess` |
| 卡片事件上报 | `hana.emit(...)` / track（见 card-guide） |

**坑**：
- 确认框 / 弹窗：iframe 沙箱内 `window.confirm/alert` **被禁且静默失败** → 用面板内自定义确认卡。
- 开外链：iframe 内 `hana.external.open`、`target=_blank` 都不可靠 → 走**后端**打开（Windows `cmd /c start "" <url>`）。
- 隐藏失效：CSS 写了 `display:flex` 会盖掉 HTML `hidden` → 加 `[hidden]{display:none!important}`。
- 主题：必须按 `--hana-*` → 旧名 → 默认值 **三级取值链**，否则自定义主题下不跟随（详见 §B1）。

### A3. 存数据

| 存什么 | 用什么 | 能力词 | 说明 |
|---|---|---|---|
| 卡实例态（草稿纸，≤64KB） | `hana.state.get/set` | 无 | 随布局 profile 持久化 |
| App 级 KV（跨会话） | `sdk.storage.global.set/get` | 无 | JSON 可序列化；512KB 软警告 / 16MB 硬拒 |
| 按 agent 分桶 KV | `sdk.storage.agent(agentId?)` | 无 | 无参靠当前工具调用解析 |
| 用户可配的设置项 | `sdk.config.get/set/getSchema` | 无（须先声明 `contributes.settings`） | 未声明 schema 时 get 返回 undefined、set 抛错 |
| 临时文件 | 写 `sdk.dataDir` | 无 | **只能写这里**，见 §A4 |

**坑**：`sdk.config` 要在 App loaded 之后再用，别在 `defineApp` 启动期同步读。

### A4. 读写文件

**能力词**：读 App dataDir 外 → `app/resources.read`；写外 → `app/resources.write`（受保护目录永远拒绝）

**SDK**：`hana.resources.open/pick/saveFile/requestAccess`（客户端）+ ResourceIO。

**坑（最高频）**：
- **落盘只能写 `sdk.dataDir`**。宿主以 Node 权限模型启动 App：`--permission --allow-fs-write=<ctx.dataDir>`，全机只放行这一处。写 `os.tmpdir()` 必报 `Access to this API has been restricted`。
- 沙箱内 `fs.rmSync()` **静默失效**（不抛错也不删）→ 删文件用 `fs.unlinkSync()`。

### A5. 起子进程（跑命令行）

**能力词**：`app/process.spawn`（以 `--allow-child-process` 启动隔离进程）

**要点**：
- 一律 `execFile(cmd, [args])`，**不走 shell**；入参拒绝含 `<>|;&$` 的项（无通配/管道/变量展开）。
- 起子进程前清理代理环境变量（`HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY` 等）。
- 长驻进程（如登录轮询）可 `unref()` 但别急着 kill。
- Windows 提权：`Start-Process -Verb RunAs`；**参数含空格时**要按 Windows 引号规则拼成一整串传入，不能直接传数组。

### A6. 联网请求

**能力词**：`contributes.network`（清单里声明出网白名单，「检查过的出网门」）

**SDK**：`fetch` 或 `sdk` 提供的网络面；后端 `hana.api.fetch`。

**要点**：出网目标要在 manifest 的 `network` 里声明，否则被拦。国内直连场景记得清代理变量。

### A7. 发通知

**能力词**：`app/notifications.show`

**SDK**：`sdk.notifications.show`（title≤256 / body≤4096 UTF-8 字节）。
**前提**：需已连接本地桌面。

### A8. 参与会话与拦截

**能力词**（advisory 类，无授权=跳过裁决不报错）：
| 能力词 | 时机 |
|---|---|
| `app/hooks.agent-before-start` | agent 启动前 |
| `app/hooks.agent-pre-step` | 改写本轮将发的 messages |
| `app/hooks.tools-pre-execute` | 阻断/改写工具调用 |
| `app/hooks.tools-post-execute` | 改写工具结果 |
| `app/hooks.messages-post-assistant` | 替换定稿 assistant 消息 |
| `app/hooks.messages-post-message` | 改写完成消息（保留原 role） |
| `app/hooks.provider-before-request` | 改写发往 provider 的 payload |
| `app/hooks.provider-before-headers` | 改写请求头（支持 null 删除，凭证敏感） |
| `app/hooks.session-before-compact` | 取消或产出压缩结果 |
| `app/hooks.session-input` | 改写用户输入 / 带理由阻断 |
| `app/hooks.session-input-images` | 暴露/替换内联图片（独立同意） |
| `app/hooks.observe` | 只读生命周期观察 |

**SDK**：`sdk.hooks`（注册裁决）+ `sdk.bus.subscribe`（观察）。
**会话操作**（能力词按动词分，不是笼统的 read/write）：

| 能力词 | 干什么 |
|---|---|
| `app/session.switch-model` | 切换/创建时的 model |
| `app/session.thinking-level` | 会话 thinkingLevel |
| `app/session.permission-mode` | 会话 permissionMode |
| `app/session.start-turn` | 向会话发消息、发起回合 |
| `app/session.stage-file` | 把文件投递进会话（`sdk.sessions.stageFile`） |
| `app/session.tools.configure` | 预留，目前不开放行为 |
| `app/session.post-message` | inputBanner 按钮投递消息（首用词） |
| `app/session.read-selection` | 选区右键菜单拿选中文本（首用词，16KB 上限） |
| `app/sessions.read` / `.manage` / `.search` | 跨所有权边界读写/搜索会话 |
| `app/agents.read` / `.manage` | 跨边界读/管理 Agent |

完整 70 词见 `references/api-capabilities.md` §1.4~1.5。

### A9. 开后端路由

**能力词**：无（不需要额外声明）

**SDK**：
```js
sdk.routes.register((app) => {
  app.get("/hello", (c) => c.json({ ok: true }));
});
```
- 回调收到宿主 Hono 实例；**只许调一次**；disposer 撤回整个路由 app。
- 客户端用 `hana.api.fetch('/hello')` 调（自动带 surface session 头）。

### A10. 开原生窗口

**能力词**：`app/windows.manage`（宿主拥有窗口身份与生命周期）

**SDK**：后端 `sdk.windows.*` 铸造；前端 `hana.window.getContext/getDroppedResources/request/onRequest/control/close`。
**限制**：桥是 `window.hanaAppWindow`；普通 iframe 没有原生窗口桥。

### A11. 显示自定义输入面板

**能力词**：`app/input.panels`

**SDK**：`sdk.userInteraction.show/dismiss/updatePanel`，及 `ask` 的 `contentFrame`。
**相关**：输入栏状态项 `app/input.status` → `sdk.inputStatus.set/remove` + 声明 `contributes.ui.inputStatus`。

---

## B. 卡片与主题

### B1. 卡片与主题

**权威文档**：宿主 `~/.hanako/card-guide/guide.md`（273 行，必读）。

**主题契约（关键）**：
- 宿主把主题挂在 **iframe URL 参数**上：`hana-css` / `hana-theme-appearance` / `hana-palette-{light,dark}-css`。宿主**不往 HTML 注入**，面板要自己读参数、动态挂 `link`。
- CSS 变量三级取值链：`--hana-*`（custom 主题）→ 旧主题名 → 字面默认值。
- 圆角跟随 `--hana-corner-radius-scale`。
- 顶部 **36 CSS px 是标题栏 bleed zone**：装饰可进，信息与控件不能进。

**卡片交付**：用 `show_card`（完整文档 / 片段 / 模板 / 文件包四种来源）；截图用 `card_screenshot`。

### B2. 卡片封面（本套流程统一签名）

→ 见 `references/cover-guide.md`。骨架：深色圆角方块 + 单色极简剪影，尺寸自适应，换符号不换结构。

---

## C. 打包与发布

### C1. 打包与发布

**工具**（官方 skill 自带）：
```bash
node scripts/validate_app.mjs --dir <app> --json        # 静态校验
node scripts/pack_app.mjs --dir <app> --publisher "名" --out ./dist  # 打包
node scripts/validate_app.mjs --archive <zip> --json     # 校验产物
```

**纪律**：
- 测试文件放**仓库根** `tests/`，别放 App 目录（打包器不支持排除规则，会打进包）。
- 写 `manifest.json` 用无 BOM 编码（PowerShell 5.1 `Set-Content -Encoding UTF8` 会加 BOM 破坏 JSON）。
- 发布顺序：**先 push 成功 → 再打 tag → 再 create release**（否则 tag 打在旧提交上）。
- Release 说明用 `--notes-file` 传（here-string 里的反引号会破坏 PowerShell 语法）。
- 版本号：小改动只递增第三位，成组新功能才动第二位。

---

## D. Hana 本体补充（官方 skill 没写、但开发常用）

> 这些是「Hana 自己」能给开发者的资源，官方 `hana-app-creator` 讲得不全。
> 组织原则：**按"什么时候用哪个"**，不是资源清单。路径以本机 0.1050.9 为准，版本升级后 server 目录名会变（取最新那个）。

### D1. 官方完整开发指南 `APPS.md`（最重要）

| 项 | 内容 |
|---|---|
| 位置 | `<server>/APPS.md`，如 `...\artifacts\server\0.1050.9-...\APPS.md` |
| 是什么 | **3022 行**的《v2 应用开发指南》——比官方 SKILL.md 详细得多。SKILL.md 是入口，这才是正文 |
| 何时用 | 要确认某个 contributes 键、尺寸契约、发布流程的**权威细节**时 |
| 提示 | 官方 `author_tools.mjs` 靠「向上找含 APPS.md 的目录」定位工具链，所以 APPS.md 也是工具链的锚点 |

### D2. 制卡手册 `card-guide`

| 项 | 内容 |
|---|---|
| 位置 | `~/.hanako/card-guide/guide.md`（约 275 行） |
| 是什么 | 引擎自有的制卡手册：§1 流式渲染、§2 包裹与 `styleProfile`、§2.1 `window.card` host bridge 协议、§2.2 声明式标记、§3 宿主注入的 CSS 变量表 |
| 何时用 | **从零写交互卡片代码时必读**（`show_card` 的工具描述里也推这个路径） |
| 注意 | 每次启动无条件覆写，改了会被还原——是引擎产物，别当自己的文件改 |

### D3. 卡片配方 Recipes（现成的视觉零件库）

> 位置：`~/.hanako/recipes/<名字>/`。做 App 里的卡片时，**先看有没有现成模板，别从零画**。

| Recipe | 提供什么 | 什么时候用 |
|---|---|---|
| `hana-card-style` | 视觉组件套件：阅读/数据组件、媒体布局、控件、折线/条形图、六色分类调色板；带 `assets/*.css|js` + 5 个可跑示例 | 要一套统一的卡片视觉语言时 |
| `hana-magic-cards` | 17 个可直接铸造的小工具模板：笔记（13 种外观）、待办、番茄钟、天气、钢琴 | 做轻量实用工具卡时 |
| `hana-presentation-cards` | 4 个信息展示模板（overview/comparison/timeline/data-board）+ 60 张氛围图库 | 做知识/数据展示类卡片时 |
| `style-atlas` | 风格图鉴：70 个成文样式模板（按 6 类分目录）+ 可浏览筛选的门面卡 | 要特定视觉风格（纸感/暗色科技/游戏波普…）时 |

### D4. 开发辅助脚本（官方 author tools）

> 位置：`<server>/scripts/`（官方 skill 的 `scripts/` 是它们的转发入口）。

| 脚本 | 作用 | 何时用 |
|---|---|---|
| `validate-app.mjs` | 静态校验 App 包（清单、资源、路由） | 每次改完必跑 |
| `extension-pack.mjs` | 打包成安装 zip | 交付/发布前 |
| `extension-index-build.mjs` | 生成市场索引（索引 v2） | 发布到市场时 |
| `app-validation-smoke.mjs` | 运行时冒烟（需独立 Electron） | 有 Electron 时跑 |
| `app-validation-electron-driver.mjs` | Electron 驱动（供 smoke 用） | 同上 |

> 本机无独立 Electron，`--smoke` 跳过——**交付前要如实说明「运行时未验」，不要含糊过去**。

### D5. 官方脚手架脚本

| 脚本 | 用法 |
|---|---|
| `create_hana_app.py` | 生成 App 骨架：`python create_hana_app.py "My App" --path examples/apps --icon ./icon.webp [--kind ui|full]`；`ui`=WebView 卡起步，`full`=工具+消息行按钮 |

> **别自己从零造 manifest**——先用脚手架起步，再改。

### D6. 与本套体系并行的开发类 skill

| Skill | 干什么 | 与本文关系 |
|---|---|---|
| `hana-app-creator`（官方） | App 开发技术规格（本文的"字典"） | 补充，非替代 |
| `skill-creator`（官方） | 造 skill、跑 eval、优化 description | 要下沉开发流程为 skill 时用 |
| `recipe-creator`（官方） | 把卡片模式提炼成可复用 Recipe | 同类卡片第二次出现时用 |
| `hana-app-devkit`（本套） | 五阶段流程 + 本对照表 | — |

### D7. 一个关键事实：App 自带 skill 是"隐藏"的

给 App 写 `skills/` 目录可行（无需 manifest 声明，宿主加载后自行发现），但它注册为 `app:<appId>`，**默认从用户的技能列表里隐藏**，只有显式索要才可见。

**含义**：想让 skill 靠 description 被自动触发，就得放成**独立 skill**（`~/.hanako/skills/<名>/`）；App 自带的 skill 只适合当"内部随附件"。本套体系因此选独立 skill 形态。

### D8. 怎么正确「安装」一个 skill（踩过的坑）

**光把文件夹复制到 `~/.hanako/skills/` 不算安装**——引擎认的是 `extensions/installs.json` 里的**安装记录**，不是磁盘上的文件。

后果：文件明明在，`extension_manager list` 和界面「本地安装」列表里却都看不见（静默失败）。

**正确做法**（两阶段）：
```
1. stage：extension_manager install kind=skill source={type:"local", path:"<skill 目录>"}
   → 拿到 stagedId
2. confirm：extension_manager confirm stagedId=<上一步的 id>
   → 写入 installs.json，落到 ~/.hanako/skills/<名>/
```

**验证**：`extension_manager list kind=skill` 能看到 `[on] skill:<名>`；`installs.json` 里出现该记录。

> 这条与 §1 的静默失败同源：动作做了，但没生效，还不报错。凡涉及「装/注册」，都先确认「记录层」有没有更新，别只看文件在不在。

---

## E. 权限声明速查（写进 manifest 的 `permissions`）

> 完整 70 词见同目录 `api-capabilities.md`。这里只列开发最常用的。

| 能力词 | 一句话 |
|---|---|
| `app/tools.expose-to-model` | 工具进模型循环 |
| `app/tools.read` | 读宿主工具目录 |
| `app/process.spawn` | 起子进程 |
| `app/resources.read` / `.write` | 读写 dataDir 外的文件 |
| `app/ui.clipboard-write` | 写剪贴板 |
| `app/ui.open-external` | 开外链 |
| `app/notifications.show` | 系统通知 |
| `app/input.panels` / `app/input.status` | 自定义输入面板 / 状态项 |
| `app/windows.manage` | 原生窗口 |
| `app/session.*` | 会话干预（见 A8 明细） |
| `app/sessions.*` / `app/agents.*` | 跨边界会话 / Agent |
| （storage 不需能力词） | 存数据直接 `sdk.storage` |
| `app/hooks.*` | 各类裁决钩子 |
| `app/events.emit` | 发本地 app_event |
| `app/public-data.publish` / `.read` | App 间内存快照 |
| `app/services.provide` / `.call` | App 间服务 |
| `app/mcp.provide/read/manage` | MCP 连接器 |
| `app/tasks.manage` | 持久任务 |

> **最小权限原则**：只声明真用到的。先用 `capability-map` 查，再写进 manifest。
