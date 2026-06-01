# Git 协作操作指南（Git Collaboration Guide）

本文档定义 UI 设计研发工作流中常见 Git 与 GitHub 操作的执行步骤。它是操作指南，不替代 Git 概念学习，也不定义 Design PR、Demo PR 或 Code PR 的交付边界。

## 适用范围

本文档适用于已经理解 fork、clone、origin、upstream、branch、commit、push 和 PR 基本概念，并需要在具体 issue 中完成远程协作操作的场景。

本文档覆盖：

- 基于 fork 配置本地仓库。
- 从 upstream 拉取最新代码。
- 基于 issue 创建工作分支。
- 提交 commit 并推送到 origin。
- 从 origin 分支向 upstream 目标分支创建 PR。
- 查看 PR 状态和 review 反馈。
- 根据 review 修改并更新 PR。

## 远程协作模型

在 fork 协作模型中，通常存在两个远端：

- `origin`：自己的 fork 仓库，用于推送个人分支。
- `upstream`：原始项目仓库，用于同步最新代码，也是 PR 的目标仓库。

本地改动的常规路径是：

```text
local branch
  ↓
origin branch
  ↓
Pull Request
  ↓
upstream branch
```

协作者应避免直接向 upstream 推送分支。个人改动应先推送到 origin，再通过 GitHub PR 提交给 upstream 审查。

## 首次配置仓库

1. 在 GitHub 上 fork 项目仓库。
2. clone 自己 fork 后的仓库：

```bash
git clone git@github.com:<your-name>/<repo>.git
cd <repo>
```

3. 确认 `origin` 指向自己的 fork：

```bash
git remote -v
```

4. 添加 `upstream` 指向原始项目仓库：

```bash
git remote add upstream git@github.com:<owner>/<repo>.git
git remote -v
```

## 同步 upstream 最新代码

开始新工作前，应先同步 upstream 的目标分支。

```bash
git fetch upstream
git switch ui
git merge upstream/ui
```

如果当前工作基于真实前端开发分支，应将 `ui` 替换为对应目标分支，例如 `dev`。

同步后再推送到自己的 origin：

```bash
git push origin ui
```

## 基于 issue 创建工作分支

工作分支应从最新目标分支创建。

```bash
git switch ui
git switch -c <branch-name>
```

分支名应能对应 issue 或工作内容，例如：

```text
design/issue-1234-notification-banner
demo/issue-1234-notification-banner
```

## 提交 commit

提交前先检查改动范围：

```bash
git status --short
git diff
```

确认只包含本次工作相关改动后，执行：

```bash
git add <files>
git commit -m "<type>: <summary>"
```

提交说明应简洁描述本次改动，例如：

```text
docs: update designer onboarding guide
design: add notification banner pencil update
demo: add notification banner interaction demo
```

## 推送到 origin

首次推送当前分支：

```bash
git push -u origin <branch-name>
```

后续更新同一个 PR 时：

```bash
git push
```

## 创建 PR 到 upstream

在 GitHub 上创建 PR 时，应确认：

- base repository 是 upstream。
- base branch 是目标分支，例如 `ui` 或 `dev`。
- compare branch 是 origin 中自己的工作分支。
- PR 描述关联对应 issue，并说明 Design PR、Demo PR 或 Code PR 的职责。

Design PR、Demo PR 和 Code PR 的标题与描述格式见：[PR 模板（Design PR Template）](./pr-template.md)。

## 查看 PR 与 review

PR 创建后，应定期查看 PR 状态和 review 反馈。

需要关注：

- PR 是否关联正确 issue。
- base branch 是否为目标分支，例如 `ui` 或 `dev`。
- review 是否有 requested changes、comments 或 unresolved conversations。
- 预览环境是否生成成功。
- 评审意见是否需要修改设计资产、demo 说明或 demo 代码。

收到 review 后，应先理解反馈，再修改文件。不要在没有确认反馈含义的情况下直接改动无关内容。

## 根据 review 更新 PR

收到 review 后，应先阅读反馈，再判断需要修改哪些文件。

常规更新步骤：

```bash
git status --short
git diff
git add <files>
git commit -m "<type>: <summary>"
git push
```

如果只是修正文档说明、补充截图或调整 demo 表达，应在 PR 描述或评论中同步说明更新内容。

## 拉取远端分支更新

如果同一分支被其他人更新，先拉取远端分支：

```bash
git fetch origin
git switch <branch-name>
git merge origin/<branch-name>
```

如果目标分支更新，需要把 upstream 最新变化合入当前工作分支：

```bash
git fetch upstream
git switch <branch-name>
git merge upstream/ui
```

如当前工作基于 `dev`，应将 `upstream/ui` 替换为 `upstream/dev`。

## AI 工具辅助边界

协作者可以请求 AI 工具辅助完成边界明确的 Git 操作，例如：

- 检查当前分支和工作区状态。
- 整理 commit message。
- 判断应提交哪些文件。
- 根据 review 修改文档或 demo 说明。
- 检查 PR 描述是否关联 issue。

不应让 AI 工具在未说明目标分支、改动范围和预期提交内容的情况下执行 Git 操作。
