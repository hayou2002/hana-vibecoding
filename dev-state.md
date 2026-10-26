# 项目状态 · hana-vibecoding 源码优化

- 目标（一句话）：以 Codex Vibecoding 的风险分档、真实验证和外部动作边界为参照，优化 Hana 源码流程，同时保留 Hana 能力索引、静态门禁和市场投稿特性。
- 当前步骤：已修正 `docs/flow.svg`、`docs/layers.svg` 的旧流程文案并完成 Edge 渲染检查；模型通道已改用 `skill-smith` 默认模型完成精简 A-G 带规则/无规则对拍；静态自检与格式检查已通过；未安装、提交或发布。
- 上次做到：两张图已按现行“风险分档、按需文档、三层证据、外部动作授权”口径改写；`README.md` 的图说明仍匹配，未额外改动。已实跑 `check_app.mjs`、`build-caps.mjs`、`quick_validate.py` 和 `git diff --check`。
- 遗留：
  - 自检已过（2026-10-26 12:09）：`check_app.mjs` 反证报 4 ERROR / 4 WARN，退出码 1；`build-caps.mjs` 退出码 0，caps 重生成后 `git status` 与 `git diff` 均无变化；`quick_validate.py` 退出码 0；`git diff --check` 退出码 0。
  - 行为评估：初次 11 个场景任务及 1 个最小探测因模型标识不可用而失败（`auto/GLM-5.3` 不存在，带完整模型前缀的配置也不可用）；改用 `skill-smith` 默认模型后，精简 A-G 带规则/无规则对拍成功。带规则组符合预期；无规则组在 A/B/C 也做对，未形成 RED/GREEN 差异。完整固定提示词逐条运行、真实仓库检查、宿主实测与发布端回读仍未覆盖。
  - Codex 包已过 quick_validate、UTF-8、SVG XML、图片渲染、HTTP 链接和本地引用检查；其真实全栈任务行为评估仍待后续。
  - 图渲染已检查：Edge headless 生成 `flow-render.png`、`layers-render.png`；两张图无空标签、文字溢出或重叠；仅文本变化，版式与配色未改。
  - 本轮不安装到 `.hanako`、不提交、不推送、不发布。
  - ✅已定案（10-01 沉淀巡检复跑 check_app，细账见两 App 开发反思 2026-10-01 段）：remote-access 真违规 external.open×3 + 缺 [hidden] 兑底×1；github-cli 死分支×1（dataDir||tmpdir 回退）+ 注释误报×3（进 v0.6 注释反判候选）；不在本批修，归那两个 App 下轮开发
  - v0.6：eval 对拍脚本化、全库瘦身、T2 新会话执行验证；新增候选：check_app 注释行反判、「线上回读」入阶段③通过清单
- 教训（攒入 0.5.1 的 dev-lessons）：发布后必须回读线上验证——本次图提交在 main 被 reset --hard 甩掉且验收无"线上回读"条，用户先于我发现；已 cherry-pick fe0c392 前修，API 证实 main 内容正确，CDN 缓存约 5 分钟自然过期
- 验收墙记录：已取消；现行流程按风险和证据推进。
