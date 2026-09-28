# Hana App 开发陪练（hana-app-devkit）

> 在官方 `hana-app-creator` 之上的一层拓展：**它教你「怎么写」，这里负责「带你写完」。**

![两大支柱与五阶段流程](docs/flow.svg)

## 这是什么

一个给 [HanaAgent](https://github.com/liliMozi/openhanako) 用的 **skill（技能包）**，解决做 Hana App 时的两个实际痛点：

1. **AI 找不到接口**——权限开了，AI 却要自己翻源码才知道能调什么、怎么调。
   → 附一份《接口与能力对照表》，按"我要做 X"组织，AI 拿着直接调，不用翻源码。

2. **开发容易跑偏**——边想边写、需求模糊、做完不收尾。
   → 一套五阶段流程陪着你走，每步有引导、有产出、有小检验。

**定位**：补充官方 `hana-app-creator`，**不替代、不重复**。官方那份是技术规格字典（573 行 SKILL.md + 3022 行 APPS.md），凡是它已写清的，本套只链接过去。

## 两个入口

### 入口 A · 接口与能力对照表

按"我想做的事"查，而不是按字母排：

| 我想… | 关键能力词 |
|---|---|
| 让 AI 在对话里调用我的功能 | `app/tools.expose-to-model` |
| 给用户一个能点的界面 | `app/ui.*` |
| 存数据 / 读写文件 | `app/resources.read/write` |
| 起子进程、联网、发通知 | `app/process.spawn` / `contributes.network` / `app/notifications.show` |
| 参与会话与拦截 | `app/hooks.*` |
| 开后端路由 / 原生窗口 / 输入面板 | — |

每个条目给出：**能力词、对应 SDK 方法、声明位置、最小示例、坑点**。所有方法名都核对过源码。

### 入口 B · 五阶段流程

| # | 阶段 | 产出 |
|---|---|---|
| ① | 目标 | 目标说明书 |
| ② | 计划 | 开发计划 |
| ③ | 雏形与验收 | 改动清单 + 验收清单 |
| ④ | 清理与优化 | 优化报告（+ 二次清单） |
| ⑤ | 保存与上传 | README / 归档 |

**流程要轻**：①③④⑤ 默认必经，② 可轻量。顺畅时不停下来汇报，只在"卡住 / 要决策 / 用户要求"时问。

## 这套流程不止能做 App

![通用层 / 专属层：骨架能搬走，专属件跟着场景换](docs/layers.svg)

五阶段骨架不是"App 开发流程"，而是**"把一个模糊想法做成可验收交付物"的通用节拍**。分两层看：

- **通用层（可迁移）**：五阶段骨架 + 贯穿规则（改动清单+验收清单、反证自检、子 Agent、能力发现）——**换场景原样搬走**。
- **专属层（绑死 App）**：能力对照表、封面签名、打包发布纪律——**换场景整块替换**。

例如：做网站 → 专属件换成"前端 API + 设计规范"；写报告 → 换成"数据源清单 + 每个结论有据"；整理复习资料 → 换成"排版模板 + 不看原文能默写"。

**迁移时最要盯住的一点：验收标准能不能判定。** App 能跑就是过，标准是硬的；换成报告 / 策划 / 资料，标准是软的——这时更要先定义清"什么叫完成"再动手。

> 现阶段它是"App 开发 skill，但骨架可迁移"，不是"通用开发 skill"。等第二个场景真跑顺了，再考虑抽独立。

## 目录结构

```
hana-app-devkit/
├── docs/
│   ├── flow.svg            # 两大支柱 + 五阶段流程图
│   └── layers.svg          # 通用层 / 专属层 分层图
├── skill/hana-app-devkit/  # ← 可直接安装的 skill 包（自包含）
│   ├── SKILL.md
│   ├── references/
│   │   ├── capability-map.md    # 任务导向的接口与能力对照表
│   │   ├── api-capabilities.md  # 70 能力词全量细节
│   │   ├── cover-guide.md       # 卡片封面统一签名规范
│   │   └── dev-lessons.md       # 静默失败清单 + 自验方法
│   └── templates/               # 五阶段产出模板
│       ├── 01-goal.md
│       ├── 02-plan.md
│       ├── 03-changes.md
│       ├── 03-acceptance.md
│       ├── 04-optimize.md
│       └── 05-readme.md
└── 需求梳理稿.md            # 需求来龙去脉（过程记录）
```

## 安装

**必须走扩展安装流程**，不能只复制文件夹——引擎认的是安装记录，光丢文件列表里看不见（踩过这个坑）。

在 Hana 里：

```
extension_manager install kind=skill source={type:"local", path:"<此仓库>/skill/hana-app-devkit"}
# → 拿到 stagedId
extension_manager confirm stagedId=<上一步的 id>
```

或在扩展管理界面点"本地安装"选 `skill/hana-app-devkit/` 目录。

## 与官方 skill 的关系

| Skill | 干什么 | 关系 |
|---|---|---|
| `hana-app-creator`（官方） | App 开发技术规格 | 本套的"字典"，补充非替代 |
| `skill-creator`（官方） | 造 skill、跑 eval | 下沉开发流程时用 |
| `recipe-creator`（官方） | 提炼卡片 Recipe | 同类卡片复用 |
| **`hana-app-devkit`（本套）** | 五阶段流程 + 对照表 | — |

## 自验

```bash
python <skill-creator>/scripts/quick_validate.py skill/hana-app-devkit
# → Skill is valid!
```

## 更新内容

### v0.1.0
- 首个版本：五阶段流程 + 接口与能力对照表（70 能力词）
- 三份 references：对照表、能力全表、踩坑清单
- 六个五阶段产出模板
- 可迁移性说明（通用层 / 专属层）
