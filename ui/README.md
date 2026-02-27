本仓库是一个 「设计工程系统」，而不仅仅是「存放设计稿」的地方。

我们通过引入 **设计左移（Shift Left in Design）**  的理念，将设计纳入工程主流程，使设计资产具备：可版本化、可审查、可追溯、可复用、可自动校验

目标是提升团队的 **端到端试错能力**，让问题在设计阶段暴露，而不是在开发或上线后修复。

## 仓库结构
docs/                         # 规范文档
system/                       # 设计系统
templates/                    # 设计模板
features/                     # 业务设计文件（给开发看）
archive/                      # 废弃设计

## 目录说明
docs/ 包含：
- 设计原则
- 命名规范
- pr-checklist
- pr-template
- 工作流说明

system/ 包含：
- Design Tokens

templates/ 包含：
- 页面结构模板
- 交互模板

features/
每个功能一个目录，必须包含：
- 设计文件（Pencil文件 .JSON .pen)
- 设计说明
- 可交互的 Demo html

archive/
废弃或历史版本设计


## 工作流及原则
````
需求 → 设计 → Design PR → Review → 合并
                              ↓ 开发实现 → Code PR
````
                        
- 所有设计变更必须通过 PR
- 所有代码 PR 必须关联对应设计
- 未合并的设计，不允许开发实现

如果你要修改设计，请先阅读：
📖 docs/team-workflow.md
📖 docs/design-review-checklist.md
📖 docs/pr-template.md