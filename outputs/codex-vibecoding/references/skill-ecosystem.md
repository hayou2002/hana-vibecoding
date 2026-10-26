# 优质 Skills 与全栈参考索引

**核对日期：2026-10-26。** 外部 skill/文档可能变化；安装前查看维护状态、适用框架、权限和许可。此处提炼流程，不复制第三方 skill 正文，也不要求安装任何一项才能使用本包。

## Agent 工作流

| 来源 | 适用环节 | 采用方式 |
|---|---|---|
| [obra/superpowers](https://github.com/obra/superpowers) | 需求探索、计划拆分、TDD、系统化调试、完成前验证、审查 | 参考其可组合工作流；本包保留按风险分流，不照搬“所有创意都先审批”的强制仪式。仓库声明 MIT；使用其文件时仍须遵守许可证。 |
| [OpenAI Codex Skills 文档](https://learn.chatgpt.com/docs/build-skills) | Codex 技能格式、技能发现与分发 | 技能入口保持小而清晰，细节渐进披露；以当前官方文档确认发现路径与安装方式。OpenAI 的旧 [skills catalog](https://github.com/openai/skills) 已标记 deprecated，主要作为格式/历史例子，优先跟随当前 Codex 文档及 OpenAI Plugins 示例。 |
| [Agent Skills 标准](https://agentskills.io/specification) | 可移植的 `SKILL.md` 格式 | 用 `name`、`description`、正文及可选资源；避免依赖单一宿主的私有运行机制。 |

## UI、React 与体验

| 来源 | 适用环节 | 采用方式 |
|---|---|---|
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | React/Next.js 性能、Web UI 规范、组合模式、React Native | 对 React/Next 项目按需查 `react-best-practices`，重点看请求瀑布、bundle 与渲染；用 `web-design-guidelines` 做无障碍/交互复核。不要把 React 规则硬套到其他技术栈。仓库 README 声明 MIT。 |
| [Playwright 官方文档](https://playwright.dev/docs/best-practices) | 浏览器端到端测试、定位器、隔离、CI、trace | 用稳定的用户可见定位器与独立测试状态；关键旅程及截图/trace 为视觉和交互验收提供证据。 |
| [W3C WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) | 无障碍验收 | 按目标合规等级和受众选择核验项；自动化工具不能证明完整符合性。 |

## API、数据与安全

| 来源 | 适用环节 | 采用方式 |
|---|---|---|
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | 身份、授权、输入验证、XSS、CSRF、文件上传、日志、API | 针对真实攻击面读具体 cheat sheet；安全规则先在服务端 enforce。该系列源码采用 CC BY-SA 4.0；本包仅链接和摘要方法，不复制原文。 |
| [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) | 风险较高应用的安全验收基线 | 按项目风险选择适用版本/等级；普通功能测试不能代替正式安全评估。 |
| [Next.js 安全指南](https://nextjs.org/docs/app/guides/data-security) 与 [Backend for Frontend 指南](https://nextjs.org/docs/app/guides/backend-for-frontend) | 采用 Next.js App Router 的服务端数据访问、授权与请求边界 | 用当前项目版本文档核对 Server Actions、Route Handlers、DAL 与身份校验位置；不要把框架特例推广到其他栈。 |
| [Prisma Migrate 文档](https://www.prisma.io/docs/orm/prisma-migrate) | 使用 Prisma 的 schema 迁移 | 核对开发/生产迁移命令和数据迁移策略；生产数据变更前明确备份与恢复边界。 |
| [Supabase Agent Skills](https://github.com/supabase/agent-skills) | 项目明确采用 Supabase 时的 Auth、Postgres、RLS、Storage 与迁移 | 只在实际使用 Supabase 时查其 `supabase` / `supabase-postgres-best-practices` skill；核对对应 Supabase 文档及仓库当前许可证，不要求全栈项目依赖 Supabase。 |

Supabase `supabase-postgres-best-practices` 的仓库页标注 MIT，适用面包含通用 Postgres 规则；Supabase 主 skill 提醒其 API/配置更新频繁，应先看 changelog 与当前官方文档。

Vercel 的技能清单随分支会变动；本次核对到 `react-best-practices` 与 `web-design-guidelines`，不同日期/分支还可见 `composition-patterns`、React Native 或部署相关技能。按现行 README 和目标栈选择，不因旧索引锁死技能名；部署技能可能直接调用托管平台，运行前必须审阅动作、目标和授权。

Superpowers 在 2026 年更新了 brainstorming 路由：小而明确的执行任务可走简短对齐，不一定产出 spec 和 implementation plan。它的核心价值在构思/计划/TDD/调试/验证可组合；对本包应采用“按风险缩放”的精神，而不是机械复制每条强制确认门。

## 如何选用 / 安装

- 先看已安装 skills 和项目已有 `AGENTS.md`。一个环节只引入真正补缺的 skill，避免多个自动工作流重复要求计划/TDD/评审。
- 用 Codex `$skill-installer` 查找/安装 curated skill，或按官方文档从明确的仓库路径安装；仅在确认来源、许可、维护状态和副作用后安装。
- 若没有相应 skill，直接查框架/平台官方文档和仓库测试，无需为了流程完整临时装一堆工具。
- 新框架/API/云服务问题优先查该库版本的官方资料；示例可能过时，不将本文链接当作锁定版本。
