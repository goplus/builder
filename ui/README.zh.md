# UI 设计工程系统

这是一个「设计工程系统」，而不仅仅是存放设计稿的目录。

通过引入设计左移（Shift Left in Design）理念，设计被纳入工程主流程，使设计资产具备可版本化、可审查、可追溯、可复用、可自动校验的特性。设计师交付的不只是静态设计稿，还包括可运行、可体验、便于前端迁移的 prototype，让设计结果更接近最终实现，而不是停留在静态表达。

目标是提升团队的端到端试错能力，让问题尽量在设计阶段暴露，而不是等到开发或上线后再修复。

## 目录结构

```text
ui/
├── components/          # 可复用设计组件
│   └── spx/
│       └── builder-component.lib.pen
├── pages/               # 页面级 Pencil 设计文件
│   └── spx/
│       ├── community-*.pen
│       ├── editor-*.pen
│       └── tutorial.pen
├── prototype/           # 可运行前端原型
├── docs/                # 工作流、模板和设计规范文档
├── skills/              # 面向 AI Agent 的任务技能
├── images/              # 字体、图片和设计素材
└── tests/               # 设计资产校验测试
    └── pen/
```

## 核心工作流

当前推荐流程：

```text
Issue
  ↓
PR（Design 发布）
  ↓
PR（Code 发布）
```

- Issue：记录需求背景、问题、预期结果和验收标准。
- Design PR：提交 Pencil 文件和 `ui/prototype` 改动，让设计和产品功能可以在 prototype 中体验。
- Code PR：基于 Design PR 的 prototype 迁移样式，并补齐真实业务逻辑。

同一个需求应通过同一个 issue 关联 Design PR 和 Code PR。

## Prototype

`ui/prototype` 是可运行的功能原型，不是孤立 demo。

它用于在 Design PR 阶段表达产品功能、页面结构、设计样式和基础交互。具体维护规则见 [Prototype Maintenance](skills/prototype-maintenance/SKILL.md)。

## 快速开始

### 设计师

1. 使用组件库：[`components/spx/builder-component.lib.pen`](components/spx/builder-component.lib.pen)
2. 在 `pages/spx/` 中维护页面级 Pencil 文件。
3. 在 `prototype/` 中同步可运行的页面和交互改动。
4. 通过 Design PR 提交 `.pen` 和 prototype 改动。

### 开发者

1. 阅读需求 issue 和 Design PR。
2. 对照 `pages/spx/*.pen` 理解设计目标。
3. 运行 `ui/prototype` 体验产品功能和样式改动。
4. 在 Code PR 中迁移样式并补齐生产业务逻辑。

## 文档

| 文档 | 说明 |
| ---- | ---- |
| [团队工作流](docs/team-workflow.md) | 当前推荐的 Issue → Design PR → Code PR 协作流程 |
| [团队工作流程（旧版）](docs/team-workflow-legacy.md) | 旧版协作流程，仅作历史参考 |
| [Issue 模板](docs/issue-template.md) | AI 生成 GitHub issue 的结构模板 |
| [PR 模板](docs/pr-template.md) | Design PR 标题和描述格式 |
| [设计审查清单](docs/design-review-checklist.md) | 提交前检查清单 |
| [设计资产校验](docs/design-asset-validation.md) | `.pen` 设计资产测试、组件库快照和 Git hook 说明 |
| [设计到代码映射（旧版）](docs/design-to-code-mapping-legacy.md) | 旧版 `.pen` 到 `spx-gui` 的映射规则，历史参考 |
| [组件文档命名](docs/component-docs-naming.md) | 组件文档命名约定 |

## Skills

| Skill | 说明 |
| ----- | ---- |
| [Prototype Maintenance](skills/prototype-maintenance/SKILL.md) | 维护 `ui/prototype` 时使用，确保 prototype 与真实前端结构、路由和交互保持一致 |

## 测试与校验

`ui/tests/pen/` 存放设计资产校验测试，用于保护组件库和页面级 Pencil 文件。详细说明见 [设计资产校验](docs/design-asset-validation.md)。
