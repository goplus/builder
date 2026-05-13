# Team Workflow

本文档定义 Builder 中涉及产品功能改动或 UI 界面改动的需求，从 issue 到 Design PR、再到 Code PR 的协作流程。

## 适用范围

本文适用于需要设计侧和前端研发协作的需求，包括：

- 产品功能新增或调整。
- 页面、组件、交互或视觉样式调整。
- 需要通过 prototype 提前验证体验或降低前端迁移成本的设计变更。

纯文档、纯后端、纯配置或不涉及用户界面的内部改动，不适用本文流程。

## 背景

XBuilder 的前端实现没有将「视觉表象」和「业务逻辑」完全分离。页面表现通常会受到业务状态、路由、交互和组件组织方式影响。

在这种前提下，设计交付如果只停留在静态 Pencil 文件，前端工程师仍然需要重新判断页面结构、交互边界和样式迁移方式，容易增加理解成本和实现偏差。另一方面，设计侧直接产出的前端代码也不能自然等同于生产代码，还需要进入真实工程结构和研发流程。

因此，团队需要一层可运行、可体验、便于迁移的 prototype，作为 Pencil 设计稿和生产代码之间的工程化交付物。

## 目标

设计交付应同时包含 Pencil 设计定义和可运行的 prototype。

目标是让需求在进入真实代码实现前，已经具备以下条件：

- 设计意图可以通过 Pencil 文件审查。
- 产品功能和基础交互可以通过 prototype 体验。
- Prototype 的代码结构尽量贴近真实前端，方便后续迁移。
- Design PR 和 Code PR 通过同一个 issue 关联，保留完整决策链路。

## 交付物

### Pencil 文件

Pencil 文件用于记录页面结构、视觉样式、组件状态和设计决策。

适用范围：

- 页面级设计变更。
- 组件视觉状态变更。
- 需要设计评审的布局、样式和视觉资产变更。

### Prototype 改动

`ui/prototype` 用于承载可运行的设计原型。

Prototype 应体现：

- 当前需求涉及的产品功能变化。
- 当前需求涉及的页面结构和样式变化。
- 必要的路由、导航和基础交互。
- 与真实前端代码相近的目录结构和组件组织方式。

Prototype 不是孤立 demo，也不是最终生产实现。它的价值在于让设计结果可体验，并降低 Code PR 阶段的样式迁移成本。

## 流程

```text
Issue
  ↓
Design PR
  ↓
Code PR
```

### 1. Issue

每个需求应使用一个 issue 贯穿设计和开发。

Issue 应记录：

- 背景
- 用户问题
- 预期结果
- 验收标准
- 相关设计、PR 或截图

Issue 是 Design PR 和 Code PR 的关联对象。Design PR 可以使用 `Updates #issue_number`，Code PR 在完全解决需求时使用 `Closes #issue_number`。

### 2. Design PR

Design PR 用于发布设计交付物。

Design PR 应包含：

- Pencil 文件改动。
- `ui/prototype` 改动。
- 对应 issue 的更新说明。
- 必要的验证说明，例如 prototype 是否可以启动、关键页面是否可访问。

Design PR 不要求实现完整生产业务逻辑，也不直接替代 Code PR。它必须让当前需求的产品功能方向、关键交互和设计样式可以被体验。

### 3. Code PR

Code PR 用于发布生产代码实现。

Code PR 应基于同一个 issue 和 Design PR：

- 参考 prototype 的页面结构、样式和交互。
- 将可复用的样式和结构迁移到真实前端代码。
- 补齐真实数据、状态管理、权限、异常处理和业务逻辑。
- 确保生产实现符合 issue 的验收标准。

Code PR 不应只从静态设计稿重新推导实现方案，而应把 Design PR 中已经验证过的 prototype 作为主要参考。

## Prototype 维护

Prototype 的维护规则已经单独整理为 skill：

- [`ui/skills/prototype-maintenance/SKILL.md`](../skills/prototype-maintenance/SKILL.md)

当任务涉及 `ui/prototype`、Pencil 页面改动同步、prototype 预览环境或 prototype 与真实前端代码对齐时，应优先使用该 skill。

## 责任边界

### Design PR

Design PR 负责回答：

- 这个需求的设计目标是什么？
- 页面和组件应该如何呈现？
- 用户应该如何体验关键流程？
- 前端工程师可以从哪里迁移样式和结构？

Design PR 不负责完整生产逻辑。

### Code PR

Code PR 负责回答：

- 真实前端如何承载这个需求？
- 哪些 prototype 样式和结构需要迁移？
- 哪些业务逻辑、数据、权限和异常状态需要补齐？
- 实现是否满足 issue 的验收标准？

Code PR 不应绕开 issue 和 Design PR 单独解释需求。

## 文档关系

- Issue 编写规则：[Issue 模板](./issue-template.md)
- Design PR 编写规则：[PR 模板](./pr-template.md)
- Prototype 维护规则：[`ui/skills/prototype-maintenance/SKILL.md`](../skills/prototype-maintenance/SKILL.md)
