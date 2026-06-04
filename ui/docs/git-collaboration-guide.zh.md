# Git 协作操作指南

> 文档类型：Tool Guide / Git 协作指南
> 稳定性：Git 协作理念长期稳定，具体命令可随团队工具更新
> 适用对象：需要提交设计资产、文档或 Demo 的协作者
> 何时阅读：开始新 Issue、创建分支、提交 Commit、创建 PR、处理评审意见时
> 维护原则：本文分为「长期理念」和「当前操作」。未来即使改用 GitHub Desktop 或 AI Agent 操作 Git，也应保留版本化、分支隔离、PR 评审 和历史追溯的原则。

## Git 在这套工作流里的意义

Git 的价值不是让设计师记住命令行，而是让设计工作具备工程协作的基本能力。

在产品设计工程化工作流中，Git 解决的是：

- 每次改动有记录；
- 每个记录有原因；
- 每个分支有边界；
- 每个 PR 有上下文；
- 每次评审都有讨论；
- 每个设计决策可以回看；
- 后续承接人可以找到依据。

因此，重要设计资产、文档和 Demo 验证都应通过 Git 和 PR 进入协作流程。

## 远程协作模型

常见 Fork 协作模型中，通常有两个远端：

| 远端 | 含义 | 用途 |
| ---- | ---- | ---- |
| `origin` | 你自己的 Fork 仓库 | 推送个人分支和草稿改动 |
| `upstream` | 原始项目仓库 | 同步最新代码，作为 PR 目标仓库 |

本地改动的路径是：

```text
local branch
  ↓
origin branch
  ↓
Pull Request
  ↓
upstream target branch
```

不要直接向公共目标分支推送个人改动。应先推送到自己的远端分支，再通过 PR 提交评审。

## 常见目标分支

在当前试验场中，可以简单理解为：

| 分支 | 职责 |
| ---- | ---- |
| `ui` | 设计资产、设计文档和体验验证的主要目标分支。 |
| `dev` | 更接近真实开发主线，用于后续生产实现。 |

具体分支策略以项目当前约定为准。开始工作前，先确认当前 Issue 应基于哪个目标分支。

## 首次配置仓库

从自己的 Fork 仓库 `clone`：

```bash
git clone git@github.com:<your-name>/<repo>.git
cd <repo>
```

确认 `origin` 指向自己的 Fork：

```bash
git remote -v
```

添加 `upstream` 指向原始项目仓库：

```bash
git remote add upstream git@github.com:<owner>/<repo>.git
git remote -v
```

如果已经配置过，不需要重复添加。

## 开始新任务前同步目标分支

以 `ui` 分支为例：

```bash
git fetch upstream
git switch ui
git merge upstream/ui
git push origin ui
```

如果当前工作基于 `dev`，把命令中的 `ui` 替换为 `dev`。

同步的目的，是避免基于过期文件继续设计或开发。

## 创建工作分支

不要直接在 `ui` 或 `dev` 上工作。每个明确任务应创建独立分支。

Design PR：

```bash
git switch -c design/issue-1234-short-name
```

Demo PR：

```bash
git switch -c demo/issue-1234-short-name
```

文档更新：

```bash
git switch -c docs/issue-1234-short-name
```

小范围修复：

```bash
git switch -c fix/issue-1234-short-name
```

建议分支名保留 Issue 编号，便于追溯。

## 提交前检查改动

提交前必须先看当前改了什么：

```bash
git status --short
```

查看具体差异：

```bash
git diff
```

如果只想查看已暂存内容：

```bash
git diff --cached
```

检查时重点确认：

- 是否只修改了当前 Issue 相关文件；
- 是否混入 `.DS_Store`、`__MACOSX/`、临时截图、本地配置；
- 是否误改了组件库或其他页面；
- 是否缺少被 `.pen` 文件引用的图片、字体或资源；
- 是否存在不应进入仓库历史的探索稿。

## 添加文件

推荐按文件添加，尤其是修改设计资产时：

```bash
git add ui/pages/spx/editor.pen
git add ui/components/spx/builder-component.lib.pen
git add ui/images/sprite-card-default.png
```

不建议在没有检查的情况下直接使用：

```bash
git add .
```

如果确实使用 `git add .`，提交前必须用下面命令再次检查：

```bash
git status --short
git diff --cached
```

## Commit 的含义

Commit 是一次可追溯的改动记录，不是普通保存。

一个好的 Commit 应该：

- 对应一个清晰意图；
- 不混入无关文件；
- 能让后来的人看懂这次改了什么；
- 能追溯到 Issue 或 PR。

推荐格式：

```bash
git commit -m "design: update sprite editor asset panel"
```

常见前缀：

| 前缀 | 用途 |
| ---- | ---- |
| `design:` | 设计资产、页面设计、组件状态更新 |
| `demo:` | Demo 验证代码或预览说明 |
| `docs:` | 文档、模板、规范更新 |
| `fix:` | 小范围问题修复 |
| `chore:` | 仓库整理、忽略文件、非功能性维护 |

示例：

```bash
git commit -m "design: add sprite item hover state"
git commit -m "demo: verify asset panel collapse interaction"
git commit -m "docs: update design workflow onboarding"
```

## `git commit -am` 的使用边界

`git commit -am "message"` 会把已经被 Git 追踪过的修改文件直接加入提交。

它不会提交新文件。

例如新增图片、新增 `.pen` 文件、新增 Markdown 文档时，必须先执行：

```bash
git add <file>
```

再提交：

```bash
git commit -m "design: add new page asset"
```

对于一直修改同一个已被追踪的 `.lib.pen` 文件，`git commit -am "wip"` 可以提交修改，但不建议长期使用 `wip` 作为正式 Commit Message。正式 PR 前应整理成语义清楚的 Commit。

## 推送分支

首次推送当前工作分支：

```bash
git push -u origin design/issue-1234-short-name
```

后续同一分支继续推送：

```bash
git push
```

推送后，在 GitHub 上从 `origin` 分支向 `upstream` 目标分支创建 PR。

## 创建 PR

创建 PR 时确认：

- `base repository` 是原始项目仓库；
- `base branch` 是目标分支，例如 `ui`；
- `compare branch` 是自己的工作分支；
- PR 类型是 Design PR、Demo PR 还是文档更新；
- PR 描述关联 Issue；
- PR 描述说明改动范围、设计意图和验证方式。

PR 描述见 [PR 模板](./pr-template.zh.md)。

## 根据评审修改

收到评审意见后，在同一工作分支继续修改即可。

```bash
# 修改文件后
git status --short
git diff
git add <files>
git commit -m "docs: address review feedback"
git push
```

同一个 PR 会自动更新。

不要因为收到评审意见后重新开一个无关 PR，除非 Reviewer 明确要求拆分。

## 同步目标分支变化

如果目标分支在评审期间有更新，可同步目标分支。

```bash
git fetch upstream
git merge upstream/ui
```

如果团队更偏好 `rebase`，可以使用：

```bash
git fetch upstream
git rebase upstream/ui
```

是否使用 `merge` 或 `rebase`，应按团队约定处理。协作者不熟悉 `rebase` 时，优先使用 `merge`，避免误改历史。

## 文件清洁规则

以下内容不应进入仓库：

```text
.DS_Store
__MACOSX/
*.tmp
*.bak
*.copy
*-copy.*
*-final.*
*-latest.*
```

建议仓库中保留 `.gitignore`：

```gitignore
.DS_Store
__MACOSX/
```

如果系统文件已经被 Git 追踪，需要移除追踪：

```bash
git rm -r --cached .DS_Store __MACOSX
git commit -m "chore: ignore macOS system files"
```

## 使用 AI Agent 操作 Git 的注意事项

让 AI Agent 协助 Git 操作前，必须先说明：

- 当前目标分支；
- 当前 Issue 编号；
- 当前 PR 类型；
- 允许修改的文件范围；
- 不允许修改的文件范围；
- 是否允许执行 `git add`；
- 是否允许执行 `git commit`；
- 是否允许执行 `git push`。

建议让 AI 先执行检查命令：

```bash
git status --short
git diff --stat
```

再由人类确认是否继续 `add`、`commit` 或 `push`。

## 常见错误

### 直接在公共分支上改动

应先创建工作分支，不直接在 `ui` 或 `dev` 上提交。

### 一个分支混多个 Issue

一个分支尽量对应一个 Issue。多个不相关改动应拆分。

### Commit 混入无关文件

提交前必须检查 `git status --short` 和 `git diff`。

### 只写 `update` 或 `wip`

正式 PR 中，Commit Message 应说明具体意图。

### 只 `git add`，没有 Commit

`git add` 不是版本记录。只有 `git commit` 才能形成可追溯历史。

## 快速命令索引

```bash
# 查看当前状态
git status --short

# 查看具体改动
git diff

# 同步 upstream
git fetch upstream

# 切换分支
git switch ui

# 创建新分支
git switch -c design/issue-1234-short-name

# 添加文件
git add <files>

# 提交
git commit -m "design: update asset panel"

# 推送当前分支
git push -u origin design/issue-1234-short-name

# 后续推送
git push
```

## 与其他文档的关系

- 工作流总览：[产品设计工程化工作流](../README.zh.md)
- 准入准备：[产品设计工程化协作准入准备](./design-engineering-onboarding.zh.md)
- 主流程：[设计到体验验证工作流](./design-to-validation-workflow.zh.md)
- PR 写作：[PR 模板](./pr-template.zh.md)
- Issue 写作：[Issue 模板](./issue-template.zh.md)
