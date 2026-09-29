# HanaAgent v2 App 开发踩坑与自验方法论

> 来源：2026-09-27~28 开发 GitHub CLI App（v0.1.2 → v0.2.8）全过程。
> 每条都注明**证据**（怎么发现的/怎么验的），未经实测的不写入。
> 用途：① 下次开发少踩坑的清单；② 作为「App 开发辅助 App」的需求雏形（见 §6）。
>
> 姊妹文档：`api-capabilities.md`（能力词查询表，回答"有什么"）；本文回答"哪里会炸"。

---

## 0. 一句话总结

**Hana App 的坑绝大多数是"静默失败"——不报错，或报了错但隐瞒真因。**
所以辅助 App 最大的价值不是"告诉你 SDK 有什么"，而是**在静默失败发生前拦住你**。

---

## 1. 静默失败清单（最高优先级：工具应主动检测）

| # | 症状 | 真因 | 正确做法 | 证据 |
|---|---|---|---|---|
| 1 | 写文件抛 `Access to this API has been restricted. Use --allow-fs-write to manage permissions.` | 宿主以 Node 权限模型启动 App：`--permission --allow-fs-write=<ctx.dataDir>`，**全机只放行 App 自己的 dataDir**。写 `os.tmpdir()` 必被拒 | 所有落盘（下载、缓存）写入 `sdk.dataDir` | 用 `node --permission --allow-fs-write=X` 复现，报错与截图逐字一致 |
| 2 | `fs.rmSync()` 报成功但文件还在 | **沙箱内 `rmSync` 静默失效**，不抛错也不删 | 删除文件用 `fs.unlinkSync()` | 沙箱内对照实验：`rmSync` 文件仍在，`unlinkSync` 正常 |
| 3 | 点「退出登录」等按钮毫无反应 | 面板跑在 iframe 沙箱内，`window.confirm/alert` **被禁且静默失败** | 需要确认时用**面板内自定义确认卡** | 面板实际表现；改确认卡后正常 |
| 4 | 面板里打开外链没反应 | iframe 内 `hana.external.open` 与 `target=_blank` 都不可靠 | 由**后端**打开（Windows: `cmd /c start "" <url>`） | 曾误改前端导致回归，改回后端即好 |
| 5 | 元素"隐藏了却还显示" | 组件 CSS 写了 `display:flex`，**盖掉了 HTML 的 `hidden` 属性** | 样式表加兜底 `[hidden]{display:none!important}` | 面板空横条/复制按钮残留，加该行根治 |
| 6 | 运行时抛 `Identifier 'x' has already been declared`，但 `node --check` 说没问题 | `node --check` **不校验 ESM 作用域内的重复声明** | 用 `node --experimental-vm-modules` + `vm.SourceTextModule` 真解析 | 人为写 `let x` 两次，`--check` 通过、`SourceTextModule` 报错 |
| 7 | 改完 manifest 报 `Unexpected token ''`（JSON 解析失败） | PowerShell 5.1 的 `Set-Content -Encoding UTF8` **会写 BOM** | 用 `[System.IO.File]::WriteAllText(path, text, (New-Object System.Text.UTF8Encoding $false))` | 首字节检查：BOM 时首字节 239，修复后 123(`{`) |

> 共同特征提醒：**1、2、3、4 都是"看起来该成功却没成功"**。写代码时凡遇到"动作发出去了但没效果"，先怀疑沙箱，而不是怀疑逻辑。

---

## 2. 主题与外观契约

| 事项 | 事实 | 证据 |
|---|---|---|
| 面板主题怎么来 | 宿主把主题挂在 **iframe URL 参数**上：`hana-css`（当前主题完整 CSS URL）、`hana-theme-appearance`、`hana-palette-{light,dark}-css`（auto 模式）。**宿主不往面板 HTML 里注入** | 读宿主渲染器源码 `hc()` 构造 iframe URL 那一段 |
| 面板该怎么做 | 读自己的 URL 参数，动态 `link` 挂载对应主题 css | 实测 5 内置 + 2 自定义主题均跟随 |
| CSS 变量怎么取 | 必须按 **`--hana-*`（custom 主题） → 旧主题名（hana/legacy） → 字面默认值** 三级取值 | 宿主 `custom` 模式只注入前缀名；只写旧名则不跟随 |
| 圆角 | 跟随 `--hana-corner-radius-scale` | 主题文件确认该变量存在 |
| `display.styleProfile` | `hana`=宿主给轻量默认；`custom`=不给全局排版；`legacy`=历史默认 | card-guide §2 |
| 顶部留白 | 顶部 **36 CSS px 是标题栏 bleed zone**，信息/控件不能进 | card-guide §2 |

> 别用 `color-mix(..., var(--sidebar-bg))` 这类依赖"主题是否定义了某变量"的写法做浅底——自定义主题常不定义 `sidebar-bg`，会掉回浅色在深色卡上发脏。用 `color-mix(in srgb, var(--gc-ink) 8%, transparent)` 从文字色推导更稳。

---

## 3. Windows 与提权

| 事项 | 事实 | 证据 |
|---|---|---|
| MSI 装/卸 | **必须提权**。进程非管理员时静默安装必失败（卸载因不落盘所以看起来正常） | 提权前"装不行、卸可以"；提权后两者均可 |
| 怎么提权 | `Start-Process -Verb RunAs` 触发 UAC；用 `-Wait -PassThru` 拿退出码 | 实跑；用户点"是"才继续 |
| 传参陷阱 | `Start-Process -ArgumentList` 传**数组**时，PS 5.1 只用空格拼接，**含空格的参数会被拆散**（路径常见） | 替身程序回传 argv：无空格 OK、含空格被切成 4 段 |
| 正确传法 | 先按 Windows 命令行规则给单个参数加双引号，再拼成**一整条字符串**传入 | 修后三组 case（GUID/含空格/含引号）argv 逐字一致 |
| 编码 | 见 §1 第 7 条（BOM 问题） | — |

---

## 4. 子进程与网络（GitHub 直连模式）

| 事项 | 做法 |
|---|---|
| 代理变量 | 起子进程前统一 `cleanEnv()` 剔除 `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY` 等 8 个变量 |
| 不做 shell 展开 | 一律 `execFile(cmd, [args])`；工具入参额外拒绝含 `<>|;&$` 的项 |
| 超时与上限 | 分清各操作超时；输出截断并提示用 `--jq`/`--limit` 收窄 |
| 设备码进程 | 拿到码后 `unref()` 但**不 kill**，gh 需持续轮询才能接住用户授权 |

---

## 5. 打包与发布

| 事项 | 事实 | 证据 |
|---|---|---|
| 打包器不支持排除规则 | 测试文件放 App 目录内会被打进包 | 解包发现 `lib/gh-core.test.mjs` 随包分发 |
| 解法 | 测试放**仓库根** `tests/`，不进 App 目录 | 重打包后包内只剩 `lib/gh-core.js` |
| 打包要核对 | 每次解包核对文件清单（尤其 `lib/`、资源） | 多次实证 |
| 版本号规范 | 小改动只递增第三位且攒着随下次发布走；成组主题变更才动第二位；结构性重塑/结束试验期才动第一位。**权威规则见 SKILL.md 阶段⑤「版本号纪律」**，本文只留指针 | 用户明确要求（0.4.0 曾两天连跳三个 .x.0，被指出虚胖后收紧） |
| 发布顺序 | **先 push 成功，再打 tag，再 create release** | 反例：tag 打在旧提交上（曾踩） |
| Release 说明 | 用 `--notes-file` 传（here-string 里的反引号会破坏 PowerShell 语法） | 实测报"字符串缺少终止符" |

---

## 6. 「App 开发辅助 App」可自动检查项（需求雏形）

> 依据：上述坑的共同点是**可被静态/半静态检查发现**。这份清单本身就是那个 App 的 MVP 需求。

### 6.1 静态扫描（读源码即可，无需运行）

- [ ] **能力声明一致性**：manifest 声明的 capability vs 代码里实际调用 → 报「声明了但没人用」（多要权限）和「用了但没声明」（必崩）
- [ ] **危险 API 用法**：源码出现 `os.tmpdir()` 写操作、`fs.rmSync`、`window.confirm/alert`、`hana.external.open` → 分别提示改用 `sdk.dataDir` / `unlinkSync` / 面板内确认卡 / 后端打开
- [ ] **`[hidden]` 兜底**：UI CSS 中有 `display:flex/grid/block` 规则但缺 `[hidden]{display:none}` → 警告"隐藏可能失效"
- [ ] **主题变量合规**：CSS 里出现裸 `var(--accent)`（无 `--hana-*` 前缀链）→ 提示自定义主题下不跟随
- [ ] **ESM 语法硬校验**：用 `vm.SourceTextModule` 解析（而非 `node --check`）→ 抓重复声明等
- [ ] **BOM 检查**：`manifest.json` 等 JSON 首字节是否为 BOM
- [ ] **打包内容核对**：解包比对实际文件 vs 预期（测试文件是否混入、`lib/` 是否在）
- [ ] **能力与最小权限**：提示哪些能力可以不要

### 6.2 运行时自验脚手架（半自动）

- [ ] **沙箱复现**：一键生成 `node --permission --allow-fs-write=<tmp>` 的探针，验证"落盘路径合法"
- [ ] **渲染实拍**：Edge 无头截图（`--headless=new --screenshot`）多尺寸/多状态/多主题；ESM 需本地 http server（`file://` 跨源会被拦）
- [ ] **主题注入模拟**：构造带 `hana-css` 等参数的 iframe，验证面板是否跟随
- [ ] **纯逻辑层单测**：引导把平台适配拆到 `lib/`，`node tests/*.test.mjs` 直接跑
- [ ] **检查方法自身的反证**：任何"检查器"都要先用一段**故意写错的代码**确认它真能报错（否则是假放心）

### 6.3 一句话产品定位（供明天讨论）

> 它不是一个"API 手册浏览器"，而是一个**"静默失败拦截器 + 自验脚手架生成器"**：
> 在写代码时提示危险写法，在打包前核对清单，在交付前替你跑一遍能跑的自验。

---

## 7. 元经验（方法论，比具体坑更值钱）

1. **先复现，再断言**。判断"是沙箱问题"而不是"我逻辑错了"，靠的是**用宿主的启动参数在本机复现**，不是读代码觉得对。
2. **验证方法本身要反证**。`vm.SourceTextModule` 能抓重复声明，是拿一段写错的代码试出来的；不然它"没报错"毫无意义。
3. **每步自验，因为用户要重装才看得见**。面板类改动，本地先渲染实拍；逻辑改动，先跑单测。
4. **分层先行**。把纯逻辑（环境清洗/版本比对/解析）抽到 `lib/`，宿主编排留在 `index.js`——这让单测成为可能。
5. **克制重构**。只动"证据确凿"的（死代码、重复、真 bug）；3 处调用的小重复不值得抽函数。
6. **一次只解决一个问题**（用户明确偏好），改完立即自验，再动下一个。

## 8. 桥接外部 CLI 的新坑（cftunnel / 远程访问 App，2026-09-28）

**教训 A：CLI 的"首次运行会联网下二进制"是隐形前置依赖。**
cftunnel relay up 第一次跑要下载 frpc，它会依次试自建镜像 + GitHub 直连——国内全挂时**进程一直挂着不退出**，表现为"启动卡住/超时被杀"，而不是报错。
- App 侧对策：启停用 `spawn detached` 而不是 execFile 等待；探测到卡下载就明确报"引擎二进制缺失，需手动放置 ~/.cftunnel/bin/frpc.exe"，并给下载指引（借道可达的服务器代拉再传回是有效兜底）。

**教训 B：pid 文件锁的假阳性比假阴性更坑。**
cftunnel 只看 `~/.cftunnel/frpc.pid` 不验进程死活：异常退出后，`status` 谎报"运行中"、`relay up` 谎报"已在运行"、`relay down` 又因杀不到进程而失败退出——三个命令全被一个 5 字节僵尸文件带偏。
- App 侧对策：不信状态命令的自述，用 `relay check --json` 的 `frpc_running`（它真去连远程端口验证）作实况源；实况为假但锁存在 → 清锁重试。这条同时救活"随宿主自启动"（重启后锁必陈旧）。

**教训 C：状态命令与检查命令的口径可以互相矛盾，两个都要采。**
`status --json.running=true` 而 `check.frpc_running=false` 是本次的真实现场。单一信源必翻车；面板与自启动都用"实况优先、状态兜底"。

**教训 D：暴露本机端口前先确认"外面访问到哪一层"。**
Hana 根路径 `/` 是 API（403/404），Web 入口在 `/desktop`→308→`/pad/`。公网地址要带对路径才有意义；面板给用户的"打开地址"直接拼 `/pad/`，别让人对着 403 JSON 困惑。
