# UI 设计系统

本仓库存放 Builder 项目的设计资源。

这是一个「设计工程系统」，而不仅仅是「存放设计稿」的地方。

我们通过引入 **设计左移（Shift Left in Design）** 的理念，将设计纳入工程主流程，使设计资产具备可版本化、可审查、可追溯、可复用、可自动校验的特性。

目标是提升团队的 **端到端试错能力**，让问题在设计阶段暴露，而不是在开发或上线后修复。

## 目录结构

```text
ui/
├── components/          # 可复用设计组件
│   └── spx/
│       └── builder-component.lib.pen
├── pages/               # 页面设计
│   └── spx/
│       ├── community-*.pen
│       ├── *-editor.pen
│       └── tutorial.pen
├── docs/                # 文档
├── images/              # 图片资源
└── archive/             # 已废弃的设计
```

## 快速开始

### 设计师

1. 组件库：[`components/spx/builder-component.lib.pen`](components/spx/builder-component.lib.pen)
2. 在 `pages/spx/` 中创建页面设计
3. 通过 PR 提交更改

### 组件库保护

为降低 `builder-component.lib.pen` 本地误操作或异常退出导致的数据丢失风险，仓库内提供了两层保护：

1. 保存即备份：在 `spx-gui/` 目录运行 `npm run watch:pen-snapshot`，监听组件库文件变更，并把快照写入 `ui/components/spx/.snapshots/`
2. 提交前校验：在 `spx-gui/` 目录先运行一次 `npm run setup:githooks`，之后每次 `git commit` 都会自动为组件库创建一次快照，并执行 `builder-component-lib.test.ts`

常用命令：

- 手动创建一次快照：`npm run snapshot:pen`
- 启动持续监听：`npm run watch:pen-snapshot`
- 手动执行一次提交前检查：`npm run validate:pen`
- 安装仓库内 Git hooks：`npm run setup:githooks`

### 开发者

页面设计位于 `pages/spx/`。每个 `.pen` 文件对应一个功能或页面。

## 文档

| 文档 | 说明 |
| ---- | ---- |
| [团队工作流程](docs/team-workflow.md) | 协作流程 |
| [AI 设计工作流程](docs/ai-design-workflow.md) | 使用 AI 还原 Figma 设计 |
| [PR 模板](docs/pr-template.md) | PR 标题和描述格式 |
| [设计审查清单](docs/design-review-checklist.md) | 提交前检查清单 |

## 工作流程

```text
Issue → 设计 (.pen)
              │
              ├─ 简单需求 → AI 生成代码 → PR → 开发审查并合并
              │
              └─ 复杂需求 → 设计提交 → 开发实现 → 代码 PR
```

## 文件命名

- 使用 kebab-case：`community-home.pen`
- 页面：`{feature-name}.pen`
