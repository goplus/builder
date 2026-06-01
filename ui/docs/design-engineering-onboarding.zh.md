# 设计研发协作准入准备（Design Engineering Onboarding）

本文档定义设计研发协作者进入 UI 设计研发工作流前必须具备的最低协作能力。它用于判断协作者是否可以基于 issue 参与设计资产维护、demo 验证和工程交接准备。

## 定义与范围

设计研发协作准入准备关注协作者是否理解设计资产、分支、PR、review、demo 验证和后续生产实现交接之间的关系。

设计研发协作者指参与产品设计、用户体验设计、内容表达、体验验证或设计资产维护，但不承担后续生产实现责任的协作者。下文简称协作者。

本文档适用于需要让设计师、产品经理、体验研究人员、内容协作者等角色参与 UI 设计研发工作流的项目。

## 非目标

本文档不定义 Git 或 GitHub 的完整教学内容，不定义从 issue 到 demo 的操作流程，不定义设计资产（当前仓库为 Pencil 文件）的文件规范，也不定义后续生产实现规则。

本文档不要求设计研发协作者掌握完整前端开发能力，不要求其独立完成生产代码实现，也不要求其承担后续生产实现的工程质量责任。

## 准入能力模型

### 1. 概念理解

协作者需要理解以下基础协作概念：

| 概念 | 准入要求 |
| ---- | -------- |
| repository | 知道项目文件、设计资产和文档都在版本库中被管理。 |
| branch | 知道不同分支代表不同工作线，并能区分 `dev` 与 `ui` 的职责。 |
| commit | 知道一次提交应对应可追溯的文件改动。 |
| remote | 知道本地改动需要通过远端分支进入协作流程。 |
| pull request | 知道 PR 是提交改动、说明范围、接受 review 和保留讨论记录的入口。 |
| review | 知道 review 用于检查设计表达、交互验证、文档说明或工程实现是否满足要求。 |
| assignee | 知道 assignee 表示当前事项或后续承接事项的负责人。 |

协作者不需要记忆所有分支和 PR 规则，但必须能按文档判断当前工作的交付归属。具体规则见：[设计到 Demo 工作流（Design to Demo Workflow）](./design-to-demo-workflow.zh.md)。

### 2. 工具状态

协作者开始具体设计工作前，应确认以下工具可用：

| 工具 | 准入要求 |
| ---- | -------- |
| GitHub | 能查看 issue、PR、review、assignee 和预览说明。 |
| VS Code | 能查看文件、编辑 Markdown 文档、查看本地文件改动。 |
| AI 工具 | 能辅助整理文档、PR 说明和变更范围检查，并能核对产出是否符合当前 issue、目标分支和交付边界。 |
| Pencil | 能打开、维护或审阅设计资产（当前仓库为 Pencil 文件）。 |
| Figma 或设计上下文读取工具 | 按需读取或整理外部设计材料。 |

### 3. 协作判断

协作者应具备以下判断能力：

- 能找到并阅读当前 issue。
- 能区分当前改动属于设计资产、demo 验证还是后续生产实现，并理解设计研发工作流主要由 Design PR 和 Demo PR 承接。
- 能判断当前设计工作是否需要 demo 验证；当设计资产（当前仓库为 Pencil 文件）无法充分表达关键交互或设计表达时，应提供 demo 验证。
- 能把同一个需求下的 issue、Design PR、Demo PR 和后续生产实现承接信息关联起来。

### 4. 交付自查

协作者应具备以下自查能力：

- 能定位当前 issue 涉及的设计资产、组件库和规范文档。
- 能按照设计审查清单完成提交前自查。
- 能说明 demo 验证入口或验证说明。
- 能区分应进入仓库历史的设计资产和临时验证上下文。

## 准入标准

开始进入具体 issue 前，协作者应能够：

- 说明 `ui` 分支、Design PR、Demo PR 和后续生产实现之间的关系。
- 基于 issue 判断当前工作涉及设计资产、demo 验证还是生产实现。
- 按设计审查清单完成自查，并提供 demo 验证入口或验证说明。
- 区分应进入仓库历史的内容和临时验证上下文。
- 在使用 AI 工具时核对当前 issue、目标分支、变更范围和交付边界。

## 文档关系

- 设计到 Demo 操作流程：[设计到 Demo 工作流（Design to Demo Workflow）](./design-to-demo-workflow.zh.md)
- Pencil 文件规范：[Pencil 文件规范（Pencil Guidelines）](./pencil-guidelines.zh.md)
- Git 协作操作指南：[Git 协作操作指南（Git Collaboration Guide）](./git-collaboration-guide.zh.md)
- 设计自查标准：[设计审查清单（Design Review Checklist）](./design-review-checklist.md)
- Issue 编写规则：[Issue 模板（Issue Template）](./issue-template.md)
- PR 编写规则：[PR 模板（Design and Demo PR Template）](./pr-template.md)
