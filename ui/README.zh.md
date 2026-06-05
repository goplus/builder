# 产品设计工程化工作流

## 定位

产品设计工程化工作流，是一套以「设计左移」为核心的协作方法：把设计意图从静态稿和口头说明，转化为可版本化、可评审、可验证、可交接的协作资产。

「设计左移」不是让非研发角色承担生产代码责任，而是在研发正式投入前，先完成设计资产整理、状态覆盖、关键体验验证和验证范围说明。

XBuilder 是当前阶段的主要试验场。Pencil、GitHub 和 AI Agent 是当前工具或载体，长期保留的是基于 Git 的版本化协作结构，以及设计进入生产实现前必须完成的 Demo 验证环节。

本工作流不按固定岗位拆分责任。协作者可能同时承担设计资产维护、Demo 验证、评审和交接说明等协作动作；因此文档按协作阶段和产物类型组织，而不是按岗位组织。

## 适用范围

适用于需要通过界面、交互和状态表达产品判断的工作，例如产品设计、UI 设计、体验设计、设计资产管理和体验验证。

长期原则不绑定 Pencil 或 GitHub，未来可以替换为更成熟的 Design to Code 工具或其他协作平台。

当前 XBuilder 落地以 Pencil、GitHub PR 和 Git 为主要载体；适用于需要多人协作、管理设计资产、验证关键体验，并把设计意图交接给后续实现人员的项目。

进入这条工作流的设计需求，必须经过 Demo PR 验证。Demo PR 的实现深度和覆盖范围可以随设计风险调整，但不能用截图、录屏、PR 说明或 checklist 替代。

## 核心链路

```text
Issue
  ↓
Design PR
  ↓
Demo PR
  ↓
后续生产实现
```

- Issue：定义问题、背景、目标、验收方向和相关材料。
- Design PR：提交设计资产，说明设计意图、改动范围和自查结果。
- Demo PR：提供可运行 Demo，说明验证范围、预览入口和后续承接事项。默认保持 Draft。
- 后续生产实现：基于已验证的设计意图完成真实数据、权限、状态管理、异常兜底、测试和上线。

## 文档地图

| 文档 | 类型 | 稳定性 | 作用 |
| ---- | ---- | ------ | ---- |
| [design-engineering-onboarding.zh.md](docs/design-engineering-onboarding.zh.md) | Onboarding | 长期稳定，随团队实践微调 | 说明参与工作流前需要理解的概念、具备的基础能力和准入完成标准。 |
| [design-to-validation-workflow.zh.md](docs/design-to-validation-workflow.zh.md) | Workflow | 长期稳定 | 定义从 Issue 到 Design PR、Demo PR、后续生产实现的主流程和边界。 |
| [git-collaboration-guide.zh.md](docs/git-collaboration-guide.zh.md) | Tool Guide | Git 协作理念长期稳定，具体命令可随团队工具更新 | 说明 Git 同步、分支、Commit、Push、PR 和评审修改的操作方式。 |
| [pencil-guidelines.zh.md](docs/pencil-guidelines.zh.md) | Guideline | 随 Pencil 和设计工具链更新 | 说明 Pencil 设计资产类型、文件职责、Slot、状态表达和入库边界。 |
| [figma-to-pencil-migration.zh.md](docs/figma-to-pencil-migration.zh.md) | Tool Guide | 随 Figma、Pencil 与设计工具链更新 | 说明从 Figma 迁移到 Pencil 的准备、规则、排查和提交前检查。 |
| [design-asset-naming.zh.md](docs/design-asset-naming.zh.md) | Standard | 通用命名原则长期稳定，Pencil 专属命名可随工具更新 | 说明设计资产、文件、组件、节点、资源和术语的命名方式。 |
| [design-asset-review-checklist.zh.md](docs/design-asset-review-checklist.zh.md) | Checklist | 随仓库结构和工具实践微调 | 检查设计资产是否适合进入仓库历史，不判断具体设计方案质量。 |
| [design-review-checklist.zh.md](docs/design-review-checklist.zh.md) | Checklist | 随设计系统和产品复杂度微调 | 检查设计表达质量，不检查 Pencil 文件组织、资源路径和命名细节。 |
| [issue-template.zh.md](docs/issue-template.zh.md) | Template | 随 GitHub 协作方式微调 | 提供 AI Agent 生成 Issue 所需字段。 |
| [pr-template.zh.md](docs/pr-template.zh.md) | Template | 随 GitHub 协作方式微调 | 提供 AI Agent 生成 PR 描述所需字段。 |

## 阅读顺序

1. 阅读本文，理解工作流定位和文档关系。
2. 阅读 [产品设计工程化协作准入准备](docs/design-engineering-onboarding.zh.md)，确认最低准入能力。
3. 阅读 [设计到体验验证工作流](docs/design-to-validation-workflow.zh.md)，理解 Issue、Design PR、Demo PR 和后续生产实现的关系。
4. 阅读 [Git 协作操作指南](docs/git-collaboration-guide.zh.md)，完成分支创建、Commit、Push 和 PR 的基本操作。
5. 如果当前项目使用 Pencil，阅读 [Pencil 设计资产规范](docs/pencil-guidelines.zh.md)。
6. 如果需要从 Figma 迁移设计稿，阅读 [Figma 到 Pencil 迁移指南](docs/figma-to-pencil-migration.zh.md)。
7. 提交前阅读 [设计资产命名](docs/design-asset-naming.zh.md)，确认文件、节点、资源和术语命名。
8. 提交前使用 [设计资产审查清单](docs/design-asset-review-checklist.zh.md) 和 [设计审查清单](docs/design-review-checklist.zh.md) 自查。

## 不在本文定义范围内

本文不定义具体产品需求、后端逻辑、生产代码测试与合并规则、完整前端架构规范，也不提供 Pencil、Git、Figma 或其他工具的完整功能教学。
