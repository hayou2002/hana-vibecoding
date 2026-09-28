# HanaAgent v2 App 能力开发查询表

> 扫描来源（全部只读，未改动）：
> - 服务端契约：`github-cli/sdk/app-contract/*.d.ts|*.js` 及其直接引用的 `sdk/app-*-capabilities.*`、`sdk/app-capability-introspection.*`、`sdk/ui-contribution-points.*`
> - 客户端桥：`github-cli/ui/assets/sdk.js`
> - 官方技能文档：`~/.hanako/skills/hana-app-creator/SKILL.md`
>
> 权威全集锚点：`APP_GRANTABLE_CAPABILITIES`（68 个可授予词）+ `APP_FIRST_USE_CAPABILITY_WORDS`（2 个首用词）= `APP_INTROSPECTABLE_CAPABILITIES`（70 个）。
> 说明：契约中的服务端上下文对象实名 `HanaPluginContextV2`（即 `apply(ctx)` 收到的 `ctx`）；`defineApp(async sdk => ...)` 收到的 `sdk` 是其异步化投影 `AppSdk`。本文以 `sdk.*` 为准逐域列出。
> 标注「未标注」= 源码中该能力词附近没有说明注释；「未确认」= 本次扫描的三个数据源内找不到依据，未做推测。

---

## 1. 能力词表（capability words，共 70 条）

### 1.1 app/tools / app/commands（目录与工具暴露）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/tools.expose-to-model | 允许本 App 注册的工具进入模型自己的 tool-call 循环 | `APP_TOOLS_EXPOSE_TO_MODEL_CAPABILITY`（app-tool-exposure.js） | 默认拒绝；组装期与每次 execute 各查一次账本，撤销下次调用即生效 |
| app/tools.read | 读取宿主已注册工具目录 | `APP_TOOLS_READ_CAPABILITY`（app-catalog-capabilities.js，注释：Permissions for reading host-registered tool and command directories） | `sdk.tools.list({scope:"all"})` 需要；own 不需要 |
| app/commands.read | 读取宿主斜杠命令目录 | `APP_COMMANDS_READ_CAPABILITY`（app-catalog-capabilities.js，同上注释） | `sdk.commands.list({scope:"all"})` 需要 |

### 1.2 app/hooks（会话钩子裁决与观察，12 条）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/hooks.agent-before-start | 允许本 App 参与 `agent/before-start` 裁决 | `APP_HOOK_CAPABILITIES`（app-hook-capabilities.js） | advisory 类（无授权=跳过裁决，不报错） |
| app/hooks.agent-pre-step | 参与 `agent/pre-step` 裁决（改写本轮将发送的 messages） | 同上 | advisory |
| app/hooks.tools-pre-execute | 参与 `tools/pre-execute` 裁决（阻断/改写工具调用） | 同上 | advisory |
| app/hooks.tools-post-execute | 参与 `tools/post-execute` 裁决（改写工具结果） | 同上 | advisory |
| app/hooks.messages-post-assistant | 参与 `messages/post-assistant` 裁决（替换定稿 assistant 消息） | 同上 | advisory |
| app/hooks.messages-post-message | 参与 `messages/post-message` 裁决（保留原 role 的完成消息改写） | 同上 | advisory |
| app/hooks.provider-before-request | 参与 `provider/before-request` 裁决（改写发往模型 provider 的 payload） | 同上 | advisory |
| app/hooks.provider-before-headers | 参与 `provider/before-headers` 裁决（改写请求头，支持 null 删除） | 同上 | advisory；凭证敏感，独立授予 |
| app/hooks.session-before-compact | 参与 `session.beforeCompact` 裁决（取消或产出压缩结果） | 同上 | advisory |
| app/hooks.session-input | 参与 `session/input` 裁决（改写用户输入文本或带理由阻断） | 同上 | advisory |
| app/hooks.session-input-images | 在 session/input 上暴露/替换内联图片的单独同意 | `APP_HOOK_SESSION_INPUT_IMAGES_CAPABILITY` | 独立于 session-input；`images: []` 即移除图片 |
| app/hooks.observe | 只读生命周期观察（跨会话，含 provider 响应元数据与 headers） | `APP_HOOK_OBSERVE_CAPABILITY`（注释：default-deny） | 观察者不能决定结果；事件词见 `APP_HOOK_EVENTS` |

### 1.3 app/ui（界面授权，4 条）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/ui.open-external | 允许 App iframe 内打开外部链接 | `APP_UI_OPEN_EXTERNAL_CAPABILITY`（app-ui-capabilities.js） | 支撑客户端能力 `external.open`（requiresGrant） |
| app/ui.clipboard-write | 允许卡片 iframe 写系统剪贴板 | `APP_UI_CLIPBOARD_WRITE_CAPABILITY` | 支撑 `clipboard.writeText` |
| app/ui.keybindings | 命令式注册主窗口快捷键 | `APP_SHORTCUTS_CAPABILITY`（dynamic-ui.js；注释：imperative UI registrations, default-deny） | `sdk.shortcuts.register` |
| app/ui.message-renderers | 命令式注册自定义消息→卡片映射 | `APP_MESSAGE_RENDERERS_CAPABILITY`（dynamic-ui.js） | `sdk.messageRenderers.register`；覆盖静态映射直到 dispose/撤销 |

### 1.4 app/session（会话干预与文件，8 条：6 可授予 + 2 首用）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/session.switch-model | 门控 `session:switch-model` 与 `session:create` 初始 model | `APP_SESSION_SWITCH_MODEL_CAPABILITY` | hard 类；未授权是显式报错不是静默丢弃 |
| app/session.thinking-level | 门控 `session:update`/`session:create` 的 `thinkingLevel` | `APP_SESSION_THINKING_LEVEL_CAPABILITY` | hard |
| app/session.permission-mode | 门控 `session:update`/`session:create` 的 `permissionMode` | `APP_SESSION_PERMISSION_MODE_CAPABILITY` | hard |
| app/session.start-turn | 门控 `session:send` 与会进模型的 `session:send-custom`；`hana.emit` 投递也要求它 | `APP_SESSION_START_TURN_CAPABILITY` | hard；idle 且显式 `triggerTurn:false` 的 send-custom 不查 |
| app/session.tools.configure | 预留：修改指定会话下次运行的工具集 | `APP_SESSION_TOOLS_CONFIGURE_CAPABILITY`（注释：Reserved…no control behavior is opened here） | 目前不开放任何行为 |
| app/session.stage-file | 把 App 数据文件或已授权资源投递进会话 | `APP_SESSION_STAGE_FILE_CAPABILITY`（注释：registration; source read and target ownership are checked separately） | `sdk.sessions.stageFile` / `resources.stage` |
| app/session.post-message | inputBanner 上 `post-message` 按钮向会话投递消息（首用授权） | `APP_SESSION_POST_MESSAGE_CAPABILITY`（app-capability-introspection.js，`APP_FIRST_USE_CAPABILITY_WORDS`） | 不在 68 个 HTTP 可授予集内；首用词，hard |
| app/session.read-selection | 选区右键菜单并入 `selectionText`（首用授权） | `APP_SESSION_READ_SELECTION_CAPABILITY`（同上）；`server/routes/plugins-v2-ui-actions.ts` | 16KB UTF-8 上限、C0 剥离（ui-contribution-points.js 注释） |

### 1.5 app/sessions / app/agents（跨所有权边界，5 条）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/sessions.read | 跨边界读会话（`scope:"all"` 的 get/history/tools/list/context/entries 等） | `APP_SESSIONS_READ_CAPABILITY`（app-entity-capabilities.js；注释：cross its own Agent/session ownership boundary） | 见 `APP_ENTITY_CAPABILITY_BY_BUS_VERB` 映射 |
| app/sessions.manage | 跨边界改会话（update/send/abort/archive/delete/fork/compact 等） | `APP_SESSIONS_MANAGE_CAPABILITY` | 同上映射 |
| app/sessions.search | 窄口径、无路径的会话搜索 | `APP_SESSIONS_SEARCH_CAPABILITY`（session-search.js 注释） | 独立于 read；queries ≤256 字符，limit 1–50 默认 30 |
| app/agents.read | 跨边界读 Agent（list/profile/config） | `APP_AGENTS_READ_CAPABILITY` | |
| app/agents.manage | 跨边界管理 Agent（update/update-config/retire/purge） | `APP_AGENTS_MANAGE_CAPABILITY` | 对本 App 自己的 Agent 也需 manage 才能 retire/purge（SKILL.md） |

### 1.6 app/media / app/provider / app/models / app/usage / app/environments（模型与媒体，15 条）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/media.generate | 门控四个 `media:*` 动词与 `provider:media-providers` | `APP_MEDIA_GENERATE_CAPABILITY`（app-media-capabilities.js 注释） | 默认拒绝 |
| app/media.provide | 门控 `sdk.media` 适配器/能力源注册 | `APP_MEDIA_PROVIDE_CAPABILITY` | 未授权时抛错文案指向 Settings → Apps → App capabilities |
| app/media.tasks.manage | 未标注 | `APP_MEDIA_TASKS_MANAGE_CAPABILITY`（仅常量名，无邻注） | 推测与 media 任务 own 范围写操作相关——未确认 |
| app/media.tasks.read-all | 未标注 | `APP_MEDIA_TASKS_READ_ALL_CAPABILITY` | 未确认 |
| app/media.tasks.manage-all | 未标注 | `APP_MEDIA_TASKS_MANAGE_ALL_CAPABILITY` | 未确认 |
| app/provider.models.manage | 未标注 | `APP_PROVIDER_MODELS_MANAGE_CAPABILITY`（列在 APP_MEDIA_CAPABILITY_WORDS 中） | 对应 `sdk.media.addModel/updateModel/removeModel` 的归属关系：未确认 |
| app/provider.provide | 授予 App 访问自己的 native provider 的能力 | `APP_PROVIDER_PROVIDE_CAPABILITY`（app-provider-capabilities.js 注释：grants an App access to its own native provider） | `sdk.providers.register` |
| app/provider.auth | 同上，provider 认证 | `APP_PROVIDER_AUTH_CAPABILITY` | App 自有 OAuth 实现可在其后处理自己的 refresh 凭证（SKILL.md） |
| app/provider.auth.environment | 同上，认证所需环境读取 | `APP_PROVIDER_AUTH_ENVIRONMENT_CAPABILITY` | |
| app/provider.credentials.read | 读宿主级 provider 凭证 | `APP_PROVIDER_CREDENTIALS_READ_CAPABILITY`（app-query-capabilities.js 注释） | 门控 `provider:credentials`（`sdk.providers.getCredentials`） |
| app/models.infer | 读取模型目录或调用模型前所需授予 | `APP_MODELS_CAPABILITY`（models.d.ts 注释：read the model catalog or invoke a model） | `sdk.models.*` |
| app/models.read | 读宿主级模型目录数据 | `APP_MODELS_READ_CAPABILITY` | 门控 `provider:models-by-type`、`provider:resolve-media-model`；也独立满足 `provider:media-providers` 只读目录 |
| app/usage.read | 读宿主级用量账本 | `APP_USAGE_READ_CAPABILITY` | 门控 `usage:list`（`sdk.usage.list`）与 `llm_usage` 订阅 |
| app/environments.manage | 操作隔离的多扩展环境 | `APP_ENVIRONMENTS_MANAGE_CAPABILITY`（environments.d.ts 注释） | `sdk.environments.*` |

### 1.7 app/runtime / app/process / app/render / app/resources（执行与资源，9 条）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/runtime.execute | 启动任何受管外部运行时的前置 | `APP_RUNTIME_CAPABILITY`（runtime.d.ts 注释） | profile 默认 scoped |
| app/runtime.network | execute 之外，显式外部网络请求的追加授予 | `APP_RUNTIME_NETWORK_CAPABILITY` | `network:"external"` 需要 |
| app/runtime.native | 显式原生执行：可读用户可读文件、原生代码与外连程序 | `APP_RUNTIME_NATIVE_CAPABILITY` | |
| app/runtime.local-machine | 用户明确授权的本机执行，无文件系统隔离 | `APP_RUNTIME_LOCAL_MACHINE_CAPABILITY` | `enforcement:"none"`；SKILL.md 强调非沙箱 |
| app/process.spawn | 以 `--allow-child-process` 启动 App 隔离进程 | `APP_PROCESS_SPAWN_CAPABILITY`（app-process-capabilities.js 注释） | spawn 时闸门：授予/撤销只在下次进程重启生效 |
| app/render.pdf | 门控 `render:html-to-pdf`（宿主 Chromium 渲 PDF） | `APP_RENDER_PDF_CAPABILITY`（app-render-capabilities.js 注释） | App 无需自己 spawn 渲染器 |
| app/resources.read | ResourceIO 读 App dataDir 之外的路径 | `APP_RESOURCES_READ_CAPABILITY`（app-resource-capabilities.js 注释：Paths inside that app's own dataDir skip the ledger） | runtime `readRoots` 越界也查它 |
| app/resources.write | ResourceIO 写 App dataDir 之外的路径 | `APP_RESOURCES_WRITE_CAPABILITY` | 受保护的 Hana 数据/App 安装根永远拒绝 |

### 1.8 app/tasks（持久任务，3 条）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/tasks.manage | 未标注（文件头注：Durable tasks that a v2 App owns on the Hana host） | `APP_TASKS_CAPABILITY`（tasks.d.ts） | own 范围任务操作 |
| app/tasks.read-all | 未标注 | `APP_TASKS_READ_ALL_CAPABILITY` | `scope:"all"` 读，未确认细节 |
| app/tasks.manage-all | 未标注 | `APP_TASKS_MANAGE_ALL_CAPABILITY` | `scope:"all"` 写，未确认细节 |

### 1.9 app/services（App 间服务，2 条）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/services.provide | 允许本 App 注册自己拥有的请求服务 | `APP_SERVICES_PROVIDE_CAPABILITY`（app-services.d.ts 注释：Default deny） | `sdk.bus.handle(name, handler, { allowCrossApp })`，宿主命名 `app:<appId>/<name>` |
| app/services.call | 允许调用其他 App  opted-in 的服务 | `APP_SERVICES_CALL_CAPABILITY` | `sdk.bus.requestService` |

### 1.10 app/mcp（MCP 连接器，3 条）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/mcp.provide | App 的 MCP 连接器管理边界：提供 | `APP_MCP_PROVIDE_CAPABILITY`（app-mcp-capabilities.js 注释：govern an App's MCP connector management boundary） | |
| app/mcp.read | 读连接器 | 同上 | `sdk.mcp.list/get`；凭证保持掩码 |
| app/mcp.manage | 改连接器 | 同上 | `sdk.mcp.update/setEnabled/removeData` |

### 1.11 app/windows / app/instances（窗口与实例，2 条）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/windows.manage | App 自有原生窗口的创建与控制 | `APP_WINDOWS_MANAGE_CAPABILITY`（windows.d.ts 注释：The host owns window identity and lifecycle） | `sdk.windows.*` |
| app/instances.manage | 创建并控制本 App 的隔离实例 | `APP_INSTANCES_MANAGE_CAPABILITY`（instances.d.ts 注释） | Apps 从不获得审批权，`requestReview` 只打开宿主复核流程 |

### 1.12 app/public-data / app/events / app/input / app/notifications（4+1+2+1 条）

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| app/public-data.publish | 发布内存态、生产者筛选的快照给同实例其他 App | `APP_PUBLIC_DATA_PUBLISH_CAPABILITY`（public-data.d.ts 注释） | 单条 64KiB/深度 32、每 App 至多 64 键（SKILL.md）；进程退出即消失 |
| app/public-data.read | 读其他 App 的发布快照 | `APP_PUBLIC_DATA_READ_CAPABILITY` | 读自己的发布不需要它 |
| app/events.emit | 向本地桌面 `app_event` 通道发事件 | `APP_EVENTS_EMIT_CAPABILITY`（app-grantable-capabilities.js 注释：Default deny） | `sdk.appEvents.emit`；宿主盖 `source: "app:{appId}"`；不达远程连接 |
| app/input.status | 显示/更新宿主渲染的输入栏状态项 | `APP_INPUT_STATUS_CAPABILITY`（app-input-status-capabilities.js 注释） | `sdk.inputStatus.set/remove`；声明 `contributes.ui.inputStatus` |
| app/input.panels | 运行可信 App 的会话输入框上方自定义 UI | `APP_INPUT_PANELS_CAPABILITY`（app-input-panel-capabilities.js 注释） | `sdk.userInteraction.show/dismiss/updatePanel` 与 ask 的 contentFrame |
| app/notifications.show | 显示本地系统通知 | `APP_NOTIFICATIONS_SHOW_CAPABILITY`（notifications.d.ts 注释） | title≤256 / body≤4096 UTF-8 字节；需已连接本地桌面 |

### 1.13 app/catalog（未列入 68 词、但源码出现的目录词）

（无。`app/tools.read`、`app/commands.read` 已归入 1.1。）

---

## 2. 服务端 SDK 域（`defineApp(async sdk => ...)` 的 `sdk.*`）

`sdk` 类型为 `AppSdk`（server-client.d.ts），= `AppEntryContext` 的异步投影 + 类型化 bus 域。`HANA_PLUGIN_CONTEXT_V2_MEMBERS` 冻结了 ctx 全集 32 名（含 `dataDir: string`，非对象）。注册类操作统一返回 `AppRegistration`（可调用 disposer + `ready` + `disposeAsync()`，registration.d.ts）。

### 2.1 AppSdk 上的直接域（28 个）

| 域 | 主要方法（含签名参数） | 需要的 sdk 能力/权限 | 备注 |
|---|---|---|---|
| sdk.tools | `register(tool: AppToolRegistration<T>): Promise<AppRegistration>`；`listOwn()`；`list(options?: {scope:"own"\|"all"})` | 暴露给模型需 `app/tools.expose-to-model`；`list({scope:"all"})` 需 `app/tools.read` | register 入参：`name/description/parameters/execute/documentAccess?/view?.providerId`；execute 收 `{...args, context:{sessionPath,messageId,messageText,callToken?,document?}}` |
| sdk.routes | `register(registrar: (app: unknown) => unknown)` | 未标注 | 回调收到宿主 Hono 实例；只许调一次；disposer 撤回整个路由 app（context.d.ts） |
| sdk.config | `get(key, opts?: {agentId?,sessionId?,sessionPath?})` / `getAll(opts?)` / `getSchema()` / `getState(options?: {redacted?})` / `forkSession({sourceSessionId,targetSessionId})` / `discardSession({sessionId})` / `set(key,value,opts?)` / `setMany(patch,opts?)` | 无（须先声明 `contributes.settings`） | 未声明 schema 时 get 返回 undefined、set 抛 `SettingsContributionValidationError`；SKILL.md：loaded 后再用，别在 defineApp 启动期同步读 |
| sdk.storage | `global` / `agent(agentId?)` 两个桶，各：`get(key,fallback?)` `getAll()` `set(key,value)` `delete(key)` `keys()` `onChanged(cb)` | 无 | 值须 JSON-可序列化；桶整体 512KB 软警告/16MB 硬拒（`APP_STORAGE_QUOTA_EXCEEDED`，context.d.ts 注）；无参 `agent()` 靠当前工具调用解析 |
| sdk.logger | `debug/error/info/warn(format, ...param)` | 无 | 仅这四档（HanaPluginLoggerV2） |
| sdk.bus | `emit(event, sessionPath?)` / `subscribe(callback, filter?)` / `handle(name, handler, options?: {allowCrossApp?})` / `request(type, payload?, options?)` / `hasHandler(type)` / `getCapability(type)` / `listCapabilities()`；扩展：`requestService(name: \`app:${string}/${string}\`, input?, options?: {timeout?,signal?})` | handle 需 `app/services.provide`；requestService 需 `app/services.call`；emit 禁宿主保留类型 | request 只认 `APP_BUS_REQUEST_ALLOWLIST`；`model:sample-text`、`utility:call-text` 不在其中，调用即 reject；handler context：`{requestId, callerAppId, signal}` |
| sdk.hooks | `onDecision<W>(word, adjudicator)` / `on<E>(event, listener)` | 每个决策词一个 `app/hooks.*`；观察需 `app/hooks.observe` | 决策词 10 个（`APP_HOOK_WORDS`），事件 6 个（`APP_HOOK_EVENTS`）；注册总是成功，是否被咨询由账本逐次决定 |
| sdk.sessions（bus 类型化） | `create` `get` `send` `update` `abort` `history` `tools` `getToolSelection` `setActiveTools` `list` `search` `sendCustom` `appendEntry` `setEntryLabel` `getEntryLabel` `switchModel` `stageFile` `registerFile` `archive` `restore` `delete` `fork` `compact` `context` `entries` | own 免授予；跨 owner 读 `app/sessions.read`、写 `app/sessions.manage`、搜索 `app/sessions.search`、stage `app/session.stage-file`；switchModel 另查 `app/session.switch-model` 等 | 与 bus 动词一一对应（`APP_SDK_BUS_METHODS.sessions`，bus-requests.js）；目标须 sessionId/legacySessionPath 或宿主 mint 的 callToken |
| sdk.agents（bus 类型化） | `createFromType` `createFromRole` `create` `list` `profile` `config` `update` `updateConfig` `retire` `purge` | 跨分区读 `app/agents.read`、写 `app/agents.manage` | 宿主强制 `visibility:"plugin_private"`、盖 ownerPluginId；retire/purge 即使自有也需 manage（SKILL.md） |
| sdk.roles | `list()` / `get({roleId})` | 未确认（扫描源内无邻注） | `AppRoleListResultV2/AppRoleGetResultV2`（agents.d.ts） |
| sdk.capabilities | `get({sessionId?}): Promise<{capabilities: AppCapabilityRowV2[]}>` | 读自己 | bus 动词 `app:capabilities`；行：`{capability, status, enforcement}`，status∈`not_asked\|denied\|session\|always`，enforcement∈`advisory\|hard`（app-capability-introspection.js） |
| sdk.usage | `list(filters?): Promise<AppUsageListResultV2>` | `app/usage.read` | filters 见 `AppUsageListFilterV2`（since/until/status/agentId/sessionId/modelId/limit…） |
| sdk.render | `htmlToPdf({callToken, html 或 htmlPath, outputName?, options?}): Promise<V2AppFileDeliveryResult>` | `app/render.pdf` | 宿主 Chromium 渲染并 stage 进调用会话 |
| sdk.models | ctx 方法：`list()` `stream(request: AppModelInferenceRequestV2): Promise<Response>` `utility(request: AppModelUtilityRequestV2): Promise<{requestId,text}>` `cancel(requestId)`；扩展：`listAvailable()`（→`model:list`）、`streamEvents(input, options?: {signal?,maxEventCharacters?}): AsyncGenerator<AppModelStreamEventV2>` | `app/models.infer`（读目录或调用前） | stream 返回 NDJSON；事件 `start/text-delta/reasoning-delta/tool-call/done/error`；`model:sample-text` 不是 App 动词 |
| sdk.media | ctx 方法（HanaPluginMediaTasksV2 12 + 注册 4）：`listTasks(options?)` `getTask(taskId, options?)` `getTaskResources(taskId, options?)` `updateTask(taskId,{favorited},options?)` `cancelTask` `retryTask` `removeTask` `removeUnfavorited(options?)` `listAdapters()` `addModel(providerId, capability, model)` `updateModel(providerId, capability, modelId, patch)` `removeModel(providerId, capability, modelId)`；注册：`registerAdapter(adapter)` `unregisterAdapter(adapterId)` `registerCapabilitySource(providerId, source)` `unregisterCapabilitySource(providerId)`；bus 扩展：`generate` `generateImage` `generateVideo` `transcribeAudio` | 任务读写 `app/media.tasks.*`（见 1.6，注释未标注）；模型管理 `app/provider.models.manage`（归属：未确认）；适配器注册 `app/media.provide`；生成动词 `app/media.generate` | transcribeAudio 结果要分支 `transcription.status`（`failed` 也是完成的请求） |
| sdk.providers | `register(descriptor: AppProviderDescriptorV2, implementation: AppNativeProviderV2): Promise<{providerId}>` `unregister(localId)`；bus 扩展：`listMediaProviders({capability?})` `getCredentials({providerId,forceRefresh?,staleApiKey?})` `listModelsByType({type,providerId?})` `resolveMediaModel(...)` `listSpeechRecognitionProviders(options?)` | 注册 `app/provider.provide`（auth 回调另需 `app/provider.auth`/`app/provider.auth.environment`）；listMediaProviders `app/media.generate` 或 `app/models.read`；getCredentials `app/provider.credentials.read`；models-by-type/resolve `app/models.read` | descriptor 上限 `APP_PROVIDER_DESCRIPTOR_MAX_MODELS=10000`；宿主构造 `app:<appId>:<id>` |
| sdk.process | `resolveExecutable(input: {candidates: readonly string[]}): Promise<AppExecutableInfoV2 \| null>` | `app/process.spawn`（process.d.ts 注释：Does not grant direct filesystem access） | 这是 process 域唯一方法；不授予文件系统 |
| sdk.commands | `register({name, aliases?, description?, usage?, handler})` `listOwn()` `list(options?: {scope?})` | `scope:"all"` 需 `app/commands.read` | handler 收 `{commandName, rawText, args, sessionPath, reply}`；identity 固定 `source:"app"`、permission 固定 `"owner"`；核心保留名直接抛错 |
| sdk.windows | `create({entry, title, bounds?, parentWindowId?, chrome?: "native"\|"custom", data?})` `list()` `get({windowId})` `close({windowId})` `control({windowId, action: show\|focus\|minimize\|maximize\|toggle-fullscreen})` `request({windowId, message})` `handleMessages(target, handler)` `onEvent(target, listener)` | `app/windows.manage` | request/handleMessages 走不透明 JSON 双向通道 |
| sdk.shortcuts | `register({id, key, toolName, args?, title?})` | `app/ui.keybindings` | 只对主窗口、仅本 App 已注册工具 |
| sdk.messageRenderers | `register({customType, cardId})` | `app/ui.message-renderers` | cardId 必须指向本 App 带 route 的声明卡 |
| sdk.appEvents | `emit(type, payload?: Record<string, unknown>)` | `app/events.emit` | 本地桌面 `app_event` 通道；`sdk.bus.emit({type:"app_event"})` 仍抛错 |
| sdk.inputBanner | `set({sessionPath, bannerId, text, buttons})` / `dismiss({sessionPath, bannerId})` | 未标注（post-message 按钮动作触发首用词 `app/session.post-message`） | 每 (sessionPath, app) 至多 1 条、每会话至多 10 个 App；text≤200 字符、按钮≤3、title≤40；按钮 `{kind:"notify-plugin"}` 或 `{kind:"post-message", text}` |
| sdk.inputStatus | `set({sessionId, id, text?, tooltip?, visible?, disabled?})` / `remove({sessionId, id})` | `app/input.status` | 配合 `contributes.ui.inputStatus` 声明；覆盖是临时的，宿主重启需重建 |
| sdk.resources | 19 个方法：`stat/read/list/search/materialize/write/writeExpectedVersion/edit/mkdir/delete/copy/rename/move/trash/watch/subscribe/resolveWatchTarget` + `stage(input: V2AppStageFileInput)` + `register(input: V2AppRegisterFileInput)` | dataDir 内免账本；越界读 `app/resources.read`、写 `app/resources.write`；stage 关联 `app/session.stage-file`（分开检查） | ref 支持 `local-file/session-file/resource/url/mount/skill/recipe/agent/card-document`；watch/subscribe 返回 `AppResourceWatchRegistration` |
| sdk.documents | `read(access)` `readRelated(access, relativeRef)` `writeExpectedVersion(access, content, expectedVersion)` `requestView(access, {method, payload?, expectedRevision})` | 无独立词：access context 由宿主从绑定的 Preview 文档铸造（工具 `documentAccess` 声明） | 永不接受 App 自备的资源引用 |
| sdk.tasks | `create(input: AppTaskCreateInputV2)` `get(taskId, options?)` `list(options?)` `update(taskId, patch, options?)` `complete(taskId, result?, options?)` `fail(taskId, error?, options?)` `cancel(taskId, reason?, options?)` `requestApproval({taskId,label,details?,timeoutMs?})` `respondApproval({approvalId,outcome})` `watch(taskId, options?): Promise<Response>` `registerHandler(handlerKey, {run(context), abort?(taskId)})` `schedule({handlerKey, scope?, callToken?, label?, payload?, intervalMs?, runAt?, enabled?})` `getSchedule` `listSchedules` `updateSchedule` `pauseSchedule` `resumeSchedule` `unschedule` `retry` `abort` `recycle` `getDelivery(taskId, options?)` | own 用 `app/tasks.manage`；`scope:"all"` 读 `app/tasks.read-all`、写 `app/tasks.manage-all`（映射依据：常量名；细节未确认） | options 形状 `{scope?: "own"\|"all"}`；delivery：`none\|next-step\|next-turn`；`chipVisibility:"hide"` 隐藏底部 chip |
| sdk.instances | `create({source: {kind:"local-file", path}, lifetimeWindowId?})` `list()` `get({instanceId})` `reload/stop/close({instanceId, revision})` `logs({instanceId, revision, after?})` `catalog({instanceId, revision})` `requestReview(...)` | `app/instances.manage` | 方法清单冻结于 `APP_INSTANCE_METHODS`；变更需带 revision |
| sdk.environments | `create({lifetimeWindowId?})` `list` `get` `close` `logs` `listInstalledSources({kind?})` `listExtensions` `inspectExtension({ref})` `installExtension({kind, source})` `copyInstalled({ref})` `requestReview({stagedId})` `setExtensionEnabled({ref, enabled})` `reloadExtension({ref})` `removeExtension({ref})` `listAgents` `listModels` `getAgent({agentId})` `createAgent` `updateAgent` `removeAgent` `catalog({agentId?})` `runTool({ref, toolName, args, agentId?})` `invokeUiAction({appId, kind: home-action\|card-chrome\|slot-action, id, sessionId?, agentId?})` | `app/environments.manage` | 方法清单 `APP_ENVIRONMENT_METHODS`（23 个）；`ExtensionRef` = `` `${ExtensionKind}:${string}` `` |
| sdk.surfaces | `open({revision, windowId, definitionId, instanceId 或 environmentId+appId, slot?, parentSurfaceId?, detached?})` `openHost(input: AppHostSurfaceOpen)` `get({surfaceId})` `move({surfaceId, windowId, detached?})` `close({surfaceId})` `workspace({surfaceId, command})` `listCardChromeViews()` `getCardChromeView({viewHandle, cardInstanceId})` `setCardChrome({viewHandle, cardInstanceId, description})` | 管理六法需实例/环境管理授权（归属未确认）；card-chrome 三法明确「不需要 instances/environments 授予」（SKILL.md） | `APP_SURFACE_METHODS` 冻结 9 法；chrome 写冲突返回稳定 code + `currentRevision`，禁止盲重试 |
| sdk.network | `fetch(input: RequestInfo \| URL, init?: RequestInit & {timeoutMs?, maxResponseBytes?, cacheTtlMs?}): Promise<Response>` | 无账本词：要求 manifest 顶层 `network` 块，否则抛结构化 "not declared" | `AppManifestNetworkV2.allowedHosts/methods/allowLocalhost/defaultTimeoutMs/maxResponseBytes` |
| sdk.publicData | `publish({key, schemaVersion, data, title?, description?})` `unpublish(key)` `get({appId, key})` `list({appId?, limit?})` | 发布 `app/public-data.publish`；读他人 `app/public-data.read` | 数据须纯 JSON；键 1–64 安全 ASCII；schemaVersion 必填正整数 |
| sdk.notifications | `show({title, body}): Promise<{shown:true}>` | `app/notifications.show` | title≤256、body≤4096 UTF-8 字节；需已连接本地桌面 |
| sdk.userInteraction | `ask(request: HanaPluginAskUserRequestV2): Promise<{action?, value?}>` `show(request: HanaPluginShowInputPanelRequestV2)` `dismiss({sessionId, id})` `updatePanel({sessionId, panelId, presentation})` | 面板/contentFrame 需 `app/input.panels` | ask 的 `timeoutMs` 上限十分钟；`requestedSchema` 为 JSON Schema 表单 |
| sdk.launchArgs | `get(name): Promise<boolean\|string\|undefined>` `getAll()` | 无：读 `contributes.cliFlags` 声明 | `hana serve -- --app.<id>.<flag>` |

### 2.2 非域成员

| 名称 | 作用 | 声明/依赖 | 备注 |
|---|---|---|---|
| sdk.dataDir | 本 App 私有可写目录路径（string，不是对象） | 无 | `AppManifestV2` 无对应字段；ResourceIO 的 dataDir 内免账本以它为界 |
| 顶层函数 `connectAppRuntime()`（runtime-client.d.ts） | 受管 `runtime:"node"` 子进程内经私有 IPC 连宿主 | 无新授予；仅 `runtime:"node"`（含 profile native），`runtime:"command"` 直起进程拿不到 | 返回 `{tasks（无 registerHandler）, models, media, network.fetch, close()}` |
| 顶层函数 `createCanvasLayout()`（canvas.d.ts） | App 本地画布布局状态机 | 无 | 只管布局文档：`createPage/selectPage/renamePage/reorderPages/removePage/insertCard/closeCard/moveCard/detachCard/attachCard/resizeCard/setCardState/renameCard/getSnapshot/subscribe` |
| 顶层函数 `readAppModelStream(response, options?)`（model-stream.d.ts） | 解码 `models.stream` 的 NDJSON | 随 stream 的授予 | 完成/出错/中断都会释放 reader |
| 顶层校验函数（providers.d.ts） | `validateAppProviderDescriptorV2(value, canonicalProviderId)`、`validateAppNativeProviderImplementationV2(descriptor, implementation)` | 无 | SDK 附带校验器 |
| 便捷包装 `searchAppSessions(bus, input, options?)`（session-search.d.ts） | 用 bus.request 调 `session:search` 的类型化包装 | `app/sessions.search`（跨 own 时） | |
| 便捷包装 `transcribeAudio(ctx, payload)` / `listSpeechRecognitionProviders(ctx)`（media.d.ts） | 走 `media:transcribe-audio` / `provider:media-providers` | `app/media.generate`（providers 读亦可用 `app/models.read`） | |

---

## 3. 客户端 SDK 面（ui/ 页面里的 `hana.*`）

来源：`ui/assets/sdk.js`。`hana.ready(payload)` 必须先 await（App 窗口 API 要求）。全局 `hana` 由 `appUiSdk(...)` 导出（`export { hana2 as hana }`），它转发 `createHanaPluginSdk()` 的全部成员，另加窗口/实例/环境专属成员。通用返回：订阅类 API 一律返回取消函数；`options` 通常含 `{timeoutMs?}`。`host.request` 之外的一切 request 型方法最终走 `request(type, payload, {timeoutMs})`（默认超时 10s，`requestTimeoutMs ?? 1e4`）。

### 3.1 基础与通信

| 名称（hana.*） | 作用（参数 → 返回） | 声明/依赖 | 备注 |
|---|---|---|---|
| ready(payload) | 握手宣告页面就绪；`payload` 任意，`undefined` 会被 host 视作可重发 → 无返回（fire event `hana.ready`） | 无 | 后续 `surface.setInteractiveRegions`、sessions 等会先补发 ready |
| emit(name, payload?, to?, options?) | 把一次完成的用户动作送进会话并唤醒 agent；返回请求 Promise | 投递需 `app/session.start-turn`（SKILL.md） | SDK 自动采集 `userGesture`；名称 `^[a-z0-9][a-z0-9._-]{0,63}$`、payload≤8KB、每卡每分钟 20 次；仅 card slot |
| track(name, payload?, options?) | 写安静活动日志，不唤醒 agent | 无 start-turn 授予 | 每卡每分钟 120 次；记录在 `{HANA_HOME}/app-card-activity/` |
| host.request(type, payload?, options?) | 直发宿主请求；Promise | 仅限 `APP_UI_HOST_REQUEST_TYPES` 白名单 | appUiSdk 里会 `assertAllowedHostRequest`，白名单外抛错；options `{timeoutMs?}` |
| toast.show(input, options?) | 窗口内提示；→ Promise | 无 | type `toast.show` |
| external.open(input, options?) | 在 App 外打开链接；`input` 可为 string(url) 或 `{url}` | 需 `app/ui.open-external` | type `external.open` |
| clipboard.writeText(input, options?) | 写系统剪贴板；`input` 可为 string 或 `{text}` | 需 `app/ui.clipboard-write` | type `clipboard.writeText` |

### 3.2 资源与文档

| 名称 | 作用（参数 → 返回） | 声明/依赖 | 备注 |
|---|---|---|---|
| resources.open(input, options?) | 请求宿主打开资源 | 三者共用 `app/resources.read`（SKILL.md 段末说明） | type `resource.open` |
| resources.pick(input = {}, options?) | 请求宿主选取资源 | 同上 | type `resource.pick` |
| resources.saveFile(input, options?) | 请求宿主另存文件 | 未确认独立授予（SKILL.md 只点名 open/pick/requestAccess 三者走 resources.read） | type `resource.saveFile` |
| resources.requestAccess(input, options?) | 为路径申请访问 | `app/resources.read`（SKILL.md） | type `resource.requestAccess` |
| sessionFile.open | （能力常量存在，`hana` 对象上未见对应方法） | 未确认 | 列入「无法归类」 |
| document.getContext(options?) | 取绑定文档上下文；普通未绑定卡返回 `null` | 需文档绑定（previewer 路由） | type `hana.document.get-context` |
| document.read(options?) | 读宿主绑定文档 | 同上 | type `hana.document.read` |
| document.reportStatus(status, options?) | 上报 `{revision, dirty, canUndo, canRedo}` | 同上 | type `hana.document.report-status` |
| document.open(input, options?) / rebind(input, options?) / openDrop(event, options?) | 打开/改绑/拖放打开文档 | 同上 | openDrop 读 `dataTransfer` 里 `application/x-hana-file-drag` 或单文件 |
| document.onRequest(handler) | 处理宿主命令：kind ∈ `save/prepareClose/revert/undo/redo`；返回取消函数 | 同上 | 请求体 `{requestId, kind, revision}` |
| document.onViewRequest(handler) | 处理视图工具 `sdk.documents.requestView` 发来的 App 自定义 method | 工具需 `documentAccess`+`view.providerId` | 与 onRequest 独立 |

### 3.3 状态与存储

| 名称 | 作用（参数 → 返回） | 声明/依赖 | 备注 |
|---|---|---|---|
| state.get(key?, options?) | 读卡实例态（草稿纸）→ Promise | 仅 card slot | type `hana.state.get`；上限 64KB（`PLUGIN_CARD_STATE_MAX_BYTES`） |
| state.set(keyOrState, value, options?) | 写卡实例态：`set(key, value)` 或 `set(stateObject)` | 仅 card slot | type `hana.state.set`；随 Client Layout Profile 持久化 |
| storage.get(key, options?) / getAll(options?) / set(key, value, options?) / delete(key, options?) / onChanged(cb) | v1 冻结兼容层插件级 KV（经宿主 owner 凭证代调） | 未标注 | type `hana.storage.*`；变更广播事件不带值只带 keys |
| storage.global.get / getAll / set / delete / keys / onChanged | v2 App 全局桶（与后端 `sdk.storage.global` 同一存储） | 无 | type `hana.app.storage.*`；`onChanged` 需显式 scope |
| storage.agent(agentId).{get,getAll,set,delete,keys,onChanged} | v2 App 单 Agent 桶 | 无 | 无 agentId 调 `onChanged` 会抛错（订阅超出单次请求生命周期） |

### 3.4 卡面、外观与主题

| 名称 | 作用（参数 → 返回） | 声明/依赖 | 备注 |
|---|---|---|---|
| ui.resize(size) | 请求调整卡高/宽；无返回（event `ui.resize`） | 无 | 受宿主分配封顶，`hana.envelope` 报实际值 |
| theme.getSnapshot() / theme.subscribe(cb) | `{theme, cssUrl, appearance?, palettes?}`；subscribe 立即回放一次并返回取消函数 | 无 | 宿主事件 `hana.theme.changed` |
| envelope.getSnapshot() / envelope.subscribe(cb) | 宿主尺寸约束：每轴 `fixed{value}/flexible{max}/unbounded`；未收到信号前 get 返回 `null` | 无 | 事件 `hana.surface.envelope.changed` |
| lifecycle.getSnapshot() / lifecycle.subscribe(cb) | 运行时快照（active、maxFrameRate 等） | 无 | 事件 `hana.surface.runtime.changed`；兼容旧 `visibility-changed` |
| performance.requestAnimationFrame(cb) → handle / cancelAnimationFrame(handle) | 受宿主帧率闸门约束的动画帧 | 无 | 用内部 pump 按 `maxFrameRate` 节流 |
| cards.open(cardId, options?: {instanceKey?}) | 打开/唤起本 App 声明的另一张卡 → Promise | 声明 `contributes.cards` | type `hana.cards.open`；options 只接受 `instanceKey`（≤256 码元、非空、无 NUL） |
| chrome.set(description, options?) | 提交完整 Chrome 描述 `{revision, title?, titleMode?, tabs?, selectedTabId?, actions?}`，revision 单视图内严格递增 → Promise | 仅真实卡视图（settings/FP/v1/preview 报 `APP_CHROME_UNAVAILABLE`） | type `hana.app.chrome.set`；上限 tabs 32、actions 16、title 256 码点 |
| chrome.onAction(handler) | 应答 `action/tab-select/tab-close`（按 `kind` 判别）；handler 可返回 `{status:"rejected", message?}`；返回取消函数 | `kind:"declared"` 的 actionId 必须已登记在 `contributes.ui.cardChrome` | type `hana.app.chrome.action` |
| chrome.registerScrollSource(element) | 上报单一布尔（滚过顶部）；不触碰描述 | 无 | event `hana.app.chrome.scroll` |
| viewState.enable(options?) | 绑定当前 document/namespace 的恢复句柄 → `{initial, signal, get(options?), set({expectedRevision, state}, options?), release(options?)}` | 仅握手卡视图；快照 24KB/合并 64KB | type `hana.app.view-state.{enable,get,set,release}`；仅 card slot |
| surface.getContext() | 同步返回 `{appId, slot, cardInstanceId?, instanceKey?, embeddedSessionId?, originSessionId?, viewState?} \| null` | 无 | 由 `normalizeSurfaceContextPayload` 定义字段 |
| surface.onContextChanged(cb) | 上下文变化订阅，立即回放一次 | 无 | 事件 `hana.app-surface.context` |
| surface.setInteractiveRegions(regions, options?) | 申报标题栏穿透区：≤64 个 `{x,y,width,height}`（CSS px、±1e6、width/height>0） → Promise | 需 0.950.0+ 的黑板/独立主卡 | 每次调用整体替换；`[]` 清空；type `hana.surface.set-interactive-regions` |

### 3.5 会话、输入面板与后端

| 名称 | 作用（参数 → 返回） | 声明/依赖 | 备注 |
|---|---|---|---|
| sessions.getActive(options?) | 当前主会话 `{sessionId, sessionPath, title, agentId} \| null` | 需 `app/sessions.read`（SKILL.md） | type `hana.sessions.get-active` |
| sessions.focus({sessionId}, options?) | 聚焦指定会话 → 打开后的快照或 reject | `app/sessions.read` | type `hana.sessions.focus`；无桥面时报 `APP_SESSION_SURFACE_UNSUPPORTED` |
| sessions.onActiveChanged(cb, onError?) | 订阅 `{previous, current, timestamp}`（首次 `previous:null`）→ 取消函数 | `app/sessions.read` | 自动 manage 远端 subscribe/unsubscribe；错误后需显式重订阅 |
| inputPanel.getContext() | 输入面板问题上下文（panelId/sessionId/confirmId/status/revision/presentation…）\| null | 面板由 `sdk.userInteraction.show` 挂载 | 事件 `hana.input-panel.context` |
| inputPanel.onContextChanged(cb) | 上下文变化订阅（立即回放） | 同上 | |
| inputPanel.onSubmit(handler) | 宿主真实确认点击时收结构化答案；身份不符回 `INPUT_PANEL_STALE` | 同上 | 返回 `{panelId, instanceId, revision, value}` |
| inputPanel.setPresentation(patch) | 改 `{height(24–4096 或 null), collapsedHeight, expanded}` → `{presentation, presentationRevision}` | 同上 | 10 秒超时；绑定期被换会整体 reject |
| api.url(apiPath) | 本 App 后端路由的完整 URL（`_runtime/<id>/...` 自动加 surface 凭证段） | iframe URL 需 `appSurfaceSession` | 拒绝绝对 URL/`api/apps` 前缀/穿越段 |
| api.fetch(apiPath, init?) | 带 `X-Hana-App-Surface-Session`（和文档绑定头）fetch 本 App 后端 → Promise\<Response\> | 同上 | |
| assets.url(assetPath) | 打包 `ui/` 资源 URL | URL 需宿主注入的 `hana-asset-base` query | 拒绝绝对 URL、`.`/`..`、点前缀段 |
| appEvents.on(type, listener) | 监听本 App 后端 `appEvents.emit` 的事件（`source === "app:{appId}"` 才回） → 取消函数 | 后端侧需 `app/events.emit` | 事件帧 `hana.app.event` |
| instances.onChanged(listener) | 收 `{instanceId, revision, state}` | 仅 App 原生窗口（需 native bridge） | 事件 `hana.app-instance.changed` |
| environments.onChanged(listener) | 收 `{environmentId, revision, state}` | 同上 | 事件 `hana.app-environment.changed` |

### 3.6 App 原生窗口专属（`hana.window` / `hana.surfaces`）

| 名称 | 作用（参数 → 返回） | 声明/依赖 | 备注 |
|---|---|---|---|
| window.getContext() | 窗口上下文 | 必须是 App 自有原生窗口，否则抛 `APP_WINDOW_UNAVAILABLE` | 桥 = `window.hanaAppWindow` |
| window.getDroppedResources(files) | 拖放文件转本地资源 | 旧宿主报 `APP_SDK_HOST_UNSUPPORTED` | |
| window.request(message) / window.onRequest(handler) | App 自定义请求/响应消息 | 同上 | 与 surfaces 通知（无需回复）分开 |
| window.onContextChanged(listener) | 窗口上下文变化 | 同上 | |
| window.onInspect(handler) / window.registerInspectionSurface(surface, handler) | 向宿主 `ui_inspect`/`ui_action` 上报 App 自有状态 | 同上；不能靠报名字自授权工具 | |
| window.control(action) / window.close() | 窗口控制与关闭 | 同上 | 后端 `app/windows.manage` 拥有生命周期 |
| surfaces.onEvent(surfaceId, listener) | 监听宿主回投的 `hana.app-surface.event`（如 host-chat-action、workspace-changed）→ 取消函数 | 表面由后端 `sdk.surfaces.open/openHost` 铸造 | surfaceId ≤256 |
| （内部）`hana.app-surface.mount / action / native` | host.request 白名单内的三个请求类型 | 未确认用途细节 | 列入「无法归类」 |

### 3.7 panel（功能面板原语）

| 名称 | 作用（参数 → 返回） | 声明/依赖 | 备注 |
|---|---|---|---|
| panel.set(props, options?) | 把 `{sections, refresh}` 推给宿主用内置原语绘制 → Promise | 仅 card slot | section kinds：`section/status/list/pills/bar/meta/actions/toggle/text`；tone：neutral/info/success/warning/danger（SKILL.md） |
| panel.onEvent(cb) | 用户点了面板：`{sectionId, kind: select\|action\|toggle, itemId?, checked?}` | 同上 | 事件 `hana.panel.event` |
| panel.onRefresh(cb) | 宿主按声明节奏叫插件重推 | 同上 | 事件 `hana.panel.refresh` |

---

## 4. 清单（manifest.json）字段表

类型名以 `app-contract/manifest.d.ts` 为准；「必填」以该 interface 是否带 `?` 为准。

### 4.1 顶层（AppManifestV2，12 字段）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| manifestVersion | `2`（字面量） | 是 | 必须恰为 2，不是「2 及以上」 |
| id | string | 是 | 须等于 App 目录名；无 `/` `\` `:`（SKILL.md） |
| name | string | 是 | 展示名 |
| version | string | 是 | 语义化版本 |
| entry | string | 是 | 包内相对路径，须解析进本 App 目录 |
| icon | string | 是 | 包相对身份图；打包/新装/更新时宿主实验 |
| capabilities | string[] | 否 | 申请的 `app/*` 能力词；装饰复核卡，不等于批准 |
| network | `AppManifestNetworkV2 \| null` | 否 | 出站门：`allowedHosts?/methods?/allowLocalhost?/defaultTimeoutMs?/maxResponseBytes?`；内部未知键（含 v1 别名 `hosts`）整 App 失败 |
| activation | `AppManifestActivationV2` | 否 | `{mode:"on-demand", tools: AppActivationToolV2[], idleTimeoutMs?}`；静态工具声明须与运行时注册一致（含 documentAccess/view） |
| minAppVersion | string | 否 | `MAJOR.MINOR.PATCH`；低于则宿主拒载 |
| formFactors | string[] | 否 | 全部卡的默认形态资格 |
| contributes | `AppManifestContributesV2` | 否 | 见 4.2 |
| description | string | 否 | 扩展列表副标题与详情页 |
| hidden | boolean | 否 | 默认 false；true 时照常运行但从列表/市场标记/`extension_manager list` 隐藏 |

### 4.2 contributes（AppManifestContributesV2，10 键）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| settings | `AppManifestSettingsContributionV2` | 否 | `{title?, schema?: AppSettingsSchemaV2, ui?: {route}}`；`ui.route` 是 `ui/` 下的自定义设置页；用 `sdk.config` 就必须保留 schema |
| ui | unknown（宿主校验） | 否 | 识别的键在 `PluginUiContributions`（ui-contribution-points.d.ts）：`messageActions/cardChrome/slots/slotContributions/contextMenus/inputStatus?/keybindings?/homeActions?`，详见 4.4 |
| cards | `AppManifestCardContributionV2[]` | 否 | 详见 4.3 |
| agentTypes | unknown（宿主校验） | 否 | 每项 `{id, title, description?, yuan?, tools?, cards?, capabilities?, privateSession?:{enabled, memory:"plugin-private"\|"none"}}`；逐条 warn-and-drop（SKILL.md） |
| messageRenderers | unknown（宿主校验） | 否 | 每项 `{customType, cardId}`；cardId 须指向本 App 带 route 的卡 |
| providers | unknown（宿主校验） | 否 | 静态 provider 身份：`{id, displayName, authType, capabilities}`；不进审批账本（SKILL.md） |
| nativeProviders | `AppProviderDescriptorV2[]` | 否 | `{id, name, models[], auth:{apiKey?\|oauth?}, refreshModels?, filterModels?, fetchDeferred?, cancelDeferred?}`；配合 `sdk.providers.register` |
| previewers | `AppManifestPreviewerContributionV2[]` | 否 | `{id, title, selectors: {extensions?\|mimeTypes?}[], route, mode:"read"\|"edit", icon?, formFactors?}`；经本 App `ui/` 树渲染 |
| cliFlags | `AppCliFlagV2[]` | 否 | `{name(^[a-z0-9][a-z0-9-]*$), type:"boolean"\|"string", description?, default?}`；`hana serve -- --app.<id>.<flag>` |
| homeActions | `AppManifestHomeActionV2[]` | 否 | `{id, title, toolName, args?, icon?: "app"\|"wrench"}`；宿主在扩展区渲染的启动动作 |

### 4.3 contributes.cards[]（AppManifestCardContributionV2，18 字段）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 数组内唯一 |
| title | string | 否 | 缺省展示 id |
| description | string | 否 | 面向模型的摘要 |
| route | string | 否 | `ui/` 相对路径，`/` 开头，无 `.. ? # \`；与 embedUrl/service 三者互斥 |
| embedUrl | string | 否 | 绝对 http(s) 回环 URL（127.0.0.1/localhost/[::1]，无 userinfo） |
| service | `AppServiceReferenceV2 {id, path}` | 否 | 指向本 App 托管服务（0.1023.0+）；不要求服务已启动；与 `detached.route` 不共存 |
| detached | `{route}` | 否 | 独立窗口整页 UI（0.942.0+） |
| detachedDefaultSize | `{width, height}` | 否 | CSS px 整数，宽 240–4096、高 160–4096（0.944.0+） |
| cardForm | string | 否 | 三态推荐：`framed/structural/edge-to-edge`（0.1017.0+）；遗留 `flush/fill/unified` 仍可读（deprecated） |
| titlebar | string | 否 | @deprecated `solid/translucent`，改用 titleMode |
| titleMode | string | 否 | `auto/show/hide`，缺省 auto；枚举外值整 App 失败 |
| realization | `"card"\|"page"\|null` | 否 | page = 整页主卡 |
| pageOf | string\|null | 否 | 挂到另一张 page 卡上 |
| closable | boolean\|null | 否 | 兼容字段；整页主卡不可独立关闭 |
| siteNavEntry | boolean\|null | 否 | 仅整页卡可写 |
| fpFullPanel | boolean\|null | 否 | 仅整页卡可写 |
| functionPanel | `{id, label?, route?, embedUrl?, service?} \| null` | 否 | id 必填非空；route/embedUrl/service 互斥；FP 的 service 不继承卡 |
| face | `{image}` | 是 | `ui/` 相对 PNG/WebP/SVG，非空实体文件；新装/开发检查强制要求 |
| pageIcon | string | 否 | 仅整页主卡的页切换图标（0.1020.0+）；SVG 禁 script/foreignObject/动画等 |
| formFactors | string[]\|null | 否 | 覆盖顶层默认 |

### 4.4 contributes.ui 子键（PluginUiContributions）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| messageActions | `UiMessageActionContribution[]` | 是（类型上必填，≤2 条） | `{id, title, icon?, messages:"assistant"\|"user"\|"all", toolName, args?}`；toolName 必须是本 App 注册的工具 |
| cardChrome | `UiCardChromeContribution[]` | 是（≤4 条） | `{id, title, icon?, toolName, args?}` + `targetCardDefinitionId` 与 `targetCard:{appId, cardId?}` 二选一；乐观解析 |
| slots | `UiPluginSlotDeclaration[]` | 是（≤8 条） | `{name(^[a-z0-9][a-z0-9-]*$), title?, render?:"iframe"}`；只开门不选址 |
| slotContributions | `UiPluginSlotContribution[]` | 是（≤16 条） | `{slot:"<appId>/<name>", id, title?, icon?, toolName?, args?, route?}`；host-primitive 与 iframe 两形态互斥；`hana/` 前缀直接拒绝 |
| contextMenus | `UiContextMenuContribution[]` | 是（≤8 条） | `{id, title, icon?, surface, toolName, args?}`；surface 须为开放席位（`hana/session.contextMenu`、`hana/chat.selection.contextMenu`、`hana/card.contextMenu`）；选区项要 `app/session.read-selection` |
| inputStatus | `UiInputStatusContribution[]` | 否 | `{id, title, icon?: check\|pin\|sync, text?, tooltip?, toolName?, args?}`；配 `app/input.status` |
| keybindings | `UiKeybindingContribution[]` | 否 | `{id, key(规范化 `Mod+Shift+K`), toolName, args?, title?}`；至少一个非 Shift 修饰键；非法/被宿主保留则单条丢弃 |
| homeActions | `UiHomeActionContribution[]` | 否 | `{id, title, toolName, args?, icon?: "app"\|"wrench"}`（与 contributes.homeActions 同形，归属差异：未确认） |

---

## 5. 卡片（UI）能力常量（sdk.js）

### 5.1 iframe 能力常量（PLUGIN_UI_CAPABILITY）

| 能力常量名 | 值（wire type） | 对应能力词 | 用途 |
|---|---|---|---|
| TOAST_SHOW | `toast.show` | 无 | 窗口内 toast |
| EXTERNAL_OPEN | `external.open` | `app/ui.open-external` | App 外打开链接（app-ui-capabilities.js 注释点名 backing `external.open`） |
| CLIPBOARD_WRITE_TEXT | `clipboard.writeText` | `app/ui.clipboard-write` | 写系统剪贴板（同上点名 `clipboard.writeText`） |
| SESSION_FILE_OPEN | `sessionFile.open` | 未确认 | 常量存在；sdk.js 的 hana 面未发现调用点 |
| RESOURCE_OPEN | `resource.open` | `app/resources.read`（SKILL.md） | 打开资源 |
| RESOURCE_PICK | `resource.pick` | `app/resources.read`（SKILL.md） | 选取资源 |
| RESOURCE_SAVE_FILE | `resource.saveFile` | 未确认 | 另存 |
| RESOURCE_REQUEST_ACCESS | `resource.requestAccess` | `app/resources.read`（SKILL.md） | 申请路径访问 |
| UI_RESIZE | `ui.resize` | 无（postEvent，非 request） | 请求调整尺寸 |
| STATE_GET / STATE_SET | `hana.state.get` / `hana.state.set` | 无 | 卡实例态（≤64KB） |
| STORAGE_GET / STORAGE_GET_ALL / STORAGE_SET / STORAGE_DELETE | `hana.storage.get/getAll/set/delete` | 未标注 | v1 冻结兼容层插件级 KV（与 v2 卡实例态并存，注释原文） |
| PANEL_SET | `hana.panel.set` | 无 | 功能面板内容推送 |
| EMIT | `hana.emit` | `app/session.start-turn`（SKILL.md） | 用户动作进会话并唤醒 agent |
| TRACK | `hana.track` | 无 | 安静活动日志 |
| UI_ACTION | `hana.ui.action` | 无（宿主驱动方向） | 宿主经 `ui_action` 工具操作卡片：describe_elements/click/type/scroll/drag/press_key/read_state（`performHostUiAction`） |

### 5.2 App 域常量

| 能力常量名 | 值 | 对应能力词 | 用途 |
|---|---|---|---|
| APP_CARD_CAPABILITY.OPEN | `hana.cards.open` | 声明 contributes.cards | 打开本 App 声明的卡 |
| APP_STORAGE_CAPABILITY.GET/GET_ALL/SET/DELETE/KEYS | `hana.app.storage.*` | 无 | v2 App 前端存储（global/agent 桶） |
| APP_SESSION_CAPABILITY.GET_ACTIVE/SUBSCRIBE/UNSUBSCRIBE/FOCUS | `hana.sessions.get-active` / `subscribe-active` / `unsubscribe-active` / `focus` | `app/sessions.read`（SKILL.md） | 前端跟随主会话 |
| APP_SURFACE_CAPABILITY.SET_INTERACTIVE_REGIONS | `hana.surface.set-interactive-regions` | 无 | 标题栏穿透区申报 |
| APP_CHROME.SET / SCROLL / ACTION / BINDING / CHALLENGE / ACK | `hana.app.chrome.*` | 无 | 卡头 Chrome 的写、滚动上报、动作回传、视图令牌绑定/挑战/回执 |
| APP_VIEW_STATE.ENABLE / GET / SET / RELEASE | `hana.app.view-state.*` | 无 | 视图状态恢复（CAS revision） |
| APP_INPUT_PANEL_MESSAGE.CONTEXT / SUBMIT / PRESENTATION | `hana.input-panel.*` | `app/input.panels`（面板挂载侧） | 输入面板桥 |
| APP_UI_HOST_REQUEST_TYPES（集合） | `hana.app-surface.mount/action/native` + 上述各 request 型常量 + `hana.document.*` | — | `hana.host.request` 的白名单 |

---

## 统计

| 章节 | 条目数 | 口径 |
|---|---|---|
| 1. 能力词表 | 70 | 68 个 `APP_GRANTABLE_CAPABILITIES`（node 实际展开验证 68）+ 2 个首用词 `APP_FIRST_USE_CAPABILITY_WORDS`；各小节标题标注数之和即 70，表行合计 71（app/tasks.read-all/manage/manage-all 在 1.7 尾部与 1.8 重复展示一次） |
| 2. 服务端 SDK 域 | 35 | 2.1 直接域 28 行 + 2.2 非域成员/顶层函数 7 行；ctx 全集 32 名由 `HANA_PLUGIN_CONTEXT_V2_MEMBERS` 冻结；`AppSdk` 上 `sessions`/`agents`/`roles`/`capabilities`/`usage`/`render` 等类型化 bus 域已并入对应行 |
| 3. 客户端 SDK 面 | 61 | 3.1–3.7 各方法/属性行合计（`sessionFile.open` 不计行，见无法归类 1） |
| 4. 清单字段 | 51 | 4.1 顶层 14 字段 + 4.2 contributes 10 键 + 4.3 cards 19 字段 + 4.4 ui 8 子键，无重叠 |
| 5. UI 能力常量 | 34 | 5.1 常量 26 个（含合并行内 4+4） + 5.2 常量组 8 行 |
| 全文能力词×方法覆盖 | — | bus 动词 46 个（`AppBusRequests`）全部有类型化 SDK 方法对应 |

### 发现但无法归类的条目

1. `PLUGIN_UI_CAPABILITY.SESSION_FILE_OPEN = "sessionFile.open"`：sdk.js 定义并随协议解析，但 `hana` 对象上无调用方法，三源内无授予说明。
2. `PLUGIN_UI_CAPABILITY.RESOURCE_SAVE_FILE = "resource.saveFile"`：有 `hana.resources.saveFile`，但 SKILL.md 只点名 open/pick/requestAccess 三者走 `app/resources.read`，saveFile 的授予归属未确认。
3. host 请求白名单内三条内部类型 `hana.app-surface.mount` / `hana.app-surface.action` / `hana.app-surface.native`：在 `APP_UI_HOST_REQUEST_TYPES` 中，但 sdk.js 未暴露同名作者方法。
4. `AppCapabilityWordV2`（index.d.ts 类型联合）包含 `AppMcpCapability` 等派生成员，与运行时 `APP_GRANTABLE_CAPABILITIES`（Set）一一对应，但类型里另有 `"app/models.infer"` 等字面量混排，无法逐词自动核对；本文以运行时 Set 展开的 68 词为准。
5. `contributes.ui.homeActions` 与顶层 `contributes.homeActions` 同形共存（`UiHomeActionContribution` vs `AppManifestHomeActionV2`），两者的读取优先级在扫描源内无说明。
6. `app/media.tasks.manage`、`app/media.tasks.read-all`、`app/media.tasks.manage-all`、`app/provider.models.manage`、`app/tasks.read-all`、`app/tasks.manage-all`：常量存在且进了授予白名单，但 `.js/.d.ts` 附近没有作用注释，只能按名称归组，语义标注为未标注/未确认。
7. `app-ui.css`（38KB）与 `app-ui.js`（716KB 打包件）：SDK 附带的前端样式/打包运行时，属实现物而非作者 API 面，未纳入章节 3 逐条清单。
8. `MARKET_INDEX_SCHEMA_VERSION`、`MarketItemV2`、`ExtensionKind`、`PermissionDeclaration`（index.d.ts re-export）：市场/扩展契约类型，超出「App 能力」范围，未单列。
