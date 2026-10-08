# 上架官方拓展市场 · 全流程手册

> 目标：把做好的 app / skill / recipe / connector / role / bundle 登记进 Hana **Global 市场**（`liliMozi/hana-marketplace`），让所有用户在拓展市场里一键安装。
> 口径唯一来源：市场仓 `CONTRIBUTING.md`（中英双语）。本手册是执行版摘要；两者冲突以官方为准。中国大陆市场独立审核发布，**不自动同步** Global 收录。

## 机制一句话

市场**不收源码、不收上传**。它只发布一份索引，指向「经维护者 PR 批准的、某个 GitHub 正式 Release 上的确切 ZIP + SHA-256」。所以上架 = ①用官方 packer 出包 → ②在你自己的公开仓库发正式 Release（两个产物成对） → ③向市场仓提登记 PR → ④等审核合并。合并即批准，发布工作流自动更新索引。

## 支持类型与命名（先对号入座）

| kind | 条目附件名 | ZIP | 新投稿注意 |
|---|---|---|---|
| `app` | `<kind>-<id>-<version>.entry.json` | `<kind>-<id>-<version>.zip` | 必须 `manifestVersion: 2`（v1 冻结，不收新投稿）；**先完成构建**，入口不能是未编译 `.ts` |
| `connector` | 同上带版本 | 同上 | **包内不得含令牌或任何凭据** |
| `role` / `bundle` | 同上带版本 | 同上 | 同 app 的版本规则 |
| `skill` | `<kind>-<id>.entry.json`（无版本） | `<kind>-<id>-<内容哈希>.zip` | version 恒为 `0.0.0`，按内容哈希更新 |
| `recipe` | `<kind>-<id>.entry.json` | `<kind>-<id>-<内容哈希>.zip` | 同 skill |

- `id` 规则：`^[a-z0-9][a-z0-9._-]{0,127}$`，不许以 `.`/`-` 结尾、不许连续 `--`。**skill/recipe 的 id 取自打包目录名**——目录先叫对名字再打包。
- 包上限 **50 MiB**。每个登记项必须能匹配到唯一的条目附件，且 ZIP 与条目在**同一个 Release** 里。

## 第 0 步 · 找到官方 packer（不需要 clone 源码）

打包工具随本机 Hana 的 server artifact 分发，就在数据目录里：

```
~/.hanako/artifacts/server/<最新版本>/scripts/extension-pack.mjs   ← 打包
~/.hanako/artifacts/server/<最新版本>/scripts/validate-app.mjs     ← App 静态校验
~/.hanako/artifacts/server/<最新版本>/APPS.md                       ← 权威文档（清单与打包要求）
```

选目录：取 `~/.hanako/artifacts/server/` 下版本号最新、且**同时有 `APPS.md` 和上面两个脚本**的那个。装过官方 `hana-app-creator` skill 的话，它的 `scripts/pack_app.mjs` 就是同一工具的包装器（用 `HANA_APP_TOOLS_ROOT` 环境变量指向上面目录即可）。

```bash
# App（目录=manifest.json 所在的那个）
node <tools>/scripts/extension-pack.mjs --kind app --dir <path/to/my-app> --publisher "<发布者名>" --out <dist>
# Skill / Recipe（目录名即 id）
node <tools>/scripts/extension-pack.mjs --kind skill --dir <path/to/my-skill> --publisher "<发布者名>" --out <dist>
# connector / role / bundle 同理换 --kind
# App 必过静态校验（--dir 与 --archive 二选一，0 error 才算过）
node <tools>/scripts/validate-app.mjs --dir <path/to/my-app>
```

产物：`.entry.json`（内嵌图标 base64、权限清单、发布者、zip 的 sha256）+ `.zip`。**不要手改大小或 SHA-256**，不要拿 GitHub 源码归档代替安装包。

## 第 1 步 · 自查清单（投稿前）

- [ ] 类型在上表之内，id 合规且**不与市场 `registry.json` 既有条目撞名**（先去看一眼现有 entries）
- [ ] app 是 manifestVersion 2 且已构建；connector 无凭据
- [ ] `--publisher` 定的名字会**烙进 entry**，登记 PR、registry 三处必须一字不差；改了就要重打
- [ ] 内容已脱敏：个人路径、私人称呼、内部服务器地址、截图里的敏感信息
- [ ] 版本号答得出"这版给用户什么新承诺"（沿用本 skill 阶段⑤纪律）

## 第 2 步 · 发正式 Release（公开仓库）

1. 扩展源码放你自己的**公开**仓库（README + LICENSE 齐），仓库和附件必须可被自动化与用户访问。
2. `gh release create <tag> <entry.json> <zip> --title ... --notes ...`——**两个产物一起传**；Release 不能是草稿或预发布。
3. tag 只允许字母数字和 `._+-`（如 `v1.2.0`）；市场只按 approvals 登记的 tag 读，不会自动选 latest。
4. **已发布的附件永远不能替换或删除**：客户端按批准的 SHA-256 校验，附件变了安装直接失败。线上包有缺陷 → **bump 新版本重打重发**，不要动旧 Release。

## 第 3 步 · 登记 PR（一包一 PR）

Fork `liliMozi/hana-marketplace`，同一分支改两个文件、追加不覆盖：

```jsonc
// registry.json → entries 数组末尾
{ "kind": "app", "id": "github-cli", "repository": "yourname/your-repo", "publisher": "yourname" }
// approvals.json → approvals 数组末尾（tag=第2步的；sha256 照抄 entry 的 archive.sha256）
{ "kind": "app", "id": "github-cli", "tag": "v0.2.9", "sha256": "<64位小写hex，勿自算>" }
```

- 本地先跑市场仓自带的同步器做只读预检（Node 24，`--check` 不写文件）：
  `node scripts/extension-market-sync.mjs --registry registry.json --approvals approvals.json --previous index.v2.json --out index.v2.json --check`
- **不要手改 `index.v2.json`**，不要为投稿改同步器/workflow。
- PR 正文按模板五段 + 勾检查清单（用 `templates/06-enroll.md`），要点：
  - 图标预览：entry 已内嵌 base64；再放一个仓库图标的 raw 链接（SVG 在 PR 正文渲染不稳定，可补 PNG 或用 README 里的图）；skill/recipe 无图标就注明"无"。
  - 截图/演示：有界面放脱敏截图；纯工具/文档类用"调用输入 → 结果示例"代替；录屏可选。
  - 自测报告：Hana 版本、OS 及版本、装过哪个 Release、测了哪些步骤与实际结果、**如实标注未测部分**——这是作者报告，不是自动验证。
  - 权限与外部服务：逐条 capability 说"为什么需要"；外部服务与用途；没有写"无"；**不附凭据**。
- 维护者合并 = 批准。合并前用户看不到；合并后发布 workflow 原子更新索引（任何一包校验失败整批不发布——自己这条出了问题要修 Release 或 approvals 再请重跑）。

## 第 4 步 · 后续更新（每次都要重走）

1. 改内容 → 重打（新 entry + 新 zip）；app/connector/role/bundle **版本必须递增**，skill/recipe 随内容哈希自动变。
2. 发**新的**正式 Release（附件成对）。
3. 提 PR：把 approvals.json 里自己那条的 `tag` 和 `sha256` 改成新值；PR 里说明更新内容与权限变化，附自测结果。
4. 登记信息（仓库、发布者）变化 → 同法改 registry.json。
5. 目录更新**不会自动替用户装/升级**，装后体验归客户端。

## 常见失败对照表

| 现象 | 先查 |
|---|---|
| 找不到可用 Release | approvals 的 tag 存不存在；是否草稿/预发布；tag 字符 |
| 找不到条目或 ZIP | 两个产物是否都在**同一** Release；附件名与登记 kind/id 是否一致 |
| 身份或完整性校验失败 | kind/id/publisher/size/sha256 与打包原始值是否一致；sha256 是否照抄 entry |
| 版本更新被拒 | 版本倒退，或试图替换同版本附件 |
| 登记已合并但目录没我 | approvals.json 里没有对应批准记录 |
| 已批准但目录没更新 | 看发布 Actions 是否成功；合并不等于发布成功 |

## 实战铁律（血泪，官方文档没写的）

1. **手搓 zip 不算数**：附件必须是 packer 原生产物（哪怕内容一样），GitHub 自动源码归档也不能代替——审核以"原始打包产物"为准。
2. **bump 优于修补**：老 Release 缺 entry、或 zip 与重打哈希对不上时，升第三位版本号重发一对，比任何绕行都省事；版本号只是信封，CHANGELOG 写清"无功能变化，补齐投稿产物"。
3. **打包非确定性**：同一份源码先后两次打包，zip 哈希可以不同（时间戳进包）。选定一个产物就锁死它，entry 与 zip 必须同一次打包成对，**跨批次混配必炸**。
4. **skill/recipe 先改目录名再打包**：id 错进 entry 就得改完重打——发现时返工成本最高的一步。
5. **投稿审核期间别发新版 Release**：维护者审的是登记那一刻绑定的包；本地继续开发没问题，但新 Release 等新 PR 走更新流程，别替换别删除。
6. **PR 图片链接走作者仓库 raw URL**：官方允许"插入可访问的图片链接"，比让 contributor 往市场仓传文件干净；提交前预览确认图能显示。
7. **publisher 三处一致**（entry / registry / 心智账户名）：建议直接用 GitHub 用户名，可验证、不歧义。
8. **一次别贪多**：一个 PR 只登记一个扩展（批量变更要维护者先同意）；多个投稿用多个独立分支，互不阻塞。

## 与开发流程的衔接

- 本手册对应 `flow.md §阶段⑤` 之后的可选环节"⑤b 上架"：交付（README + 本地 tag/release）完成后，用户提出"上架/进市场"才进这一节。
- 上架是**对外动作**：发公开 Release、提 PR，均需用户明确点头；默认不主动做。
- 上架后维护本仓 README 的"更新内容"与 approvals 记录同步演进，下次更新直接复用本手册第 4 步。
