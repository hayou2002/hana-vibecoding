# 上架登记 PR 正文模板（对应市场仓 PR 模板五段+清单）

> 用法：复制本文件为 pr-body.md，逐段填空，随登记 PR 提交。口径见 `references/market-enrollment.md`。不适用的段落写"无+原因"，别删段。

## 投稿信息 / Submission
- 扩展名称：
- 类型与 ID：`<kind>` / `<id>`（app 注明 manifestVersion 与 version；skill/recipe 写 0.0.0 按内容哈希）
- 发布者：（与 entry、registry 三处一字不差）
- 用途与主要功能：（两三句：给谁用、解决什么、核心操作）
- 作者仓库：https://github.com/<owner>/<repo>
- 正式 Release：https://github.com/<owner>/<repo>/releases/tag/<tag>（entry+ZIP 成对）
- 本次登记或变更说明：（首次投稿 / 更新内容 / 为什么 bump）

## 图标预览 / Icon preview
- 图标 raw 链接：（无图标注明："无——<kind> 无 UI 资产"）

## 截图或演示 / Screenshots or demo
- （脱敏截图直链 ×2-3 + 一句话说明；纯工具类改写"调用输入 → 结果"示例）

## 自测报告 / Author test report
- Hana 版本： / OS 及版本：
- 安装测试使用的 Release：
- 测试步骤与实际结果：（编号列出，含 validate-app 结果与单测数）
- 已知问题或未测试部分：（如实，不许留空）

## 权限与外部服务 / Permissions and external services
- （逐条 capability：名称——为什么需要；外部服务：地址与用途；无凭据无遥测请明写）

## 投稿检查 / Enrollment checklist（六项全勾 [x] 再提）
- [ ] 仅改登记数据，未传源码/安装包/截图文件
- [ ] 正式 Release 含匹配条目 JSON+ZIP
- [ ] kind/id/publisher 与条目一致
- [ ] tag 指向该 Release，sha256 照抄 entry
- [ ] 未手改 index.v2.json
- [ ] 审阅材料齐、未测已注明、图片已查敏感信息
