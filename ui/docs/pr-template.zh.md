# PR 模板

> 文档类型：Template / Design PR 与 Demo PR 写作模板
> 稳定性：随 GitHub 协作方式微调
> 适用对象：提交 Design PR、Demo PR 或设计文档 PR 的协作者
> 何时使用：创建 PR、补充 PR 描述、回应评审意见 前
> 维护原则：说明文字使用中文；可复制到 GitHub 的模板正文默认使用英文，便于直接粘贴到 PR。

## PR 的作用

PR 是提交改动、说明范围、接受评审和保留讨论记录的入口。

在产品设计工程化工作流中，PR 不只是「提交文件」，还要说明：

- 当前 PR 关联哪个 Issue；
- 当前 PR 是 Design PR 还是 Demo PR；
- 本次改动范围是什么；
- 设计意图是什么；
- 是否完成自查；
- 是否需要后续生产实现承接。

## PR 类型

| PR 类型 | 目标分支 | 职责 | 合并语义 |
| ------- | -------- | ---- | -------- |
| Design PR | `ui` | 提交设计资产，说明设计意图、变更范围和自查结果。 | 可合并，合并前只保留应进入仓库历史的设计资产。 |
| Demo PR | `ui` | 提供 Demo 代码、预览环境、截图或验证记录，用于验证关键交互和页面状态。 | 默认保持 Draft，避免 Demo 代码被误合并进主分支。 |
| Docs PR | `ui` | 更新工作流、规范、模板、检查清单等文档。 | 可合并，需保证链接和命名正确。 |

后续生产实现可以用 Code PR 表达，但 Code PR 不属于本文模板的主要范围。

## 标题规范

标题格式：

```text
[PR Type][Scope] Type: Description
```

PR Type：

```text
[Design]
[Demo]
[Docs]
```

Scope：

```text
[Page]
[Component]
[Asset]
[Workflow]
[Docs]
```

Type：

```text
Feature
Update
Fix
Chore
```

示例：

```text
[Design][Page] Feature: Add sprite editor asset panel design
[Demo][Page] Update: Verify asset panel collapse interaction
[Docs][Workflow] Update: Organize design engineering workflow docs
[Design][Component] Fix: Update sprite item hover state
```

## 通用 PR 模板

创建任意 Design PR、Demo PR 或 Docs PR 时，先复制这部分。

```markdown
### Issue

- Related to #issue_number

### PR Type

- [ ] Design PR
- [ ] Demo PR
- [ ] Docs PR

### Background

Briefly explain why this PR is needed.

### Changes

- Change 1
- Change 2
- Change 3

### Scope

This PR covers:

- In-scope item 1
- In-scope item 2

This PR does not cover:

- Out-of-scope item 1
- Out-of-scope item 2

### Review Focus

Please focus on:

- Review focus 1
- Review focus 2
- Review focus 3
```

## Design PR 专用模板

用于提交 `.pen`、`.lib.pen`、`ui/images/*` 或设计文档中的设计资产改动。

```markdown
### Design Intent

Describe the design goal, user path, key state, or product decision behind this design change.

### Design Assets Changed

- [ ] Page `.pen`
- [ ] Component `.lib.pen`
- [ ] Images or resources
- [ ] Docs

Changed files:

- `path/to/file`
- `path/to/file`

### State Coverage

- [ ] Default
- [ ] Hover / Focus / Active
- [ ] Selected
- [ ] Disabled
- [ ] Loading
- [ ] Empty
- [ ] Error
- [ ] Success
- [ ] Other:

### Design System Impact

- [ ] No design system impact
- [ ] Reuses existing components
- [ ] Updates existing components
- [ ] Adds new components
- [ ] Updates tokens or variables

Notes:

### Demo Validation

- Demo PR scope: Full interaction / Lightweight validation / TBD
- Validation focus:

### Self-check

- [ ] I have checked the design expression with the design review checklist.
- [ ] I have checked design asset organization with the design asset review checklist.
- [ ] I have checked naming rules.
- [ ] I have removed temporary files and irrelevant drafts.
- [ ] I have checked `git status --short` before submitting.

### Production Handoff

Describe what later production implementation should preserve or continue handling.
```

## Demo PR 专用模板

用于提交 Demo 代码、预览环境、截图、录屏或交互验证说明。

Demo PR 默认应保持 Draft。

```markdown
### Demo Purpose

Describe what design intent or interaction this demo validates.

### Related Design PR

- Related Design PR: #pr_number

### Demo Entry

- Preview link:
- Route:
- Screenshot:
- Recording:

### Interaction Coverage

This demo validates:

- Interaction 1
- State 1
- User path 1

This demo does not validate:

- Out-of-scope behavior 1
- Out-of-scope behavior 2

### Demo-only Boundaries

The following parts are demo-only and should not be treated as production implementation:

- Demo-only item 1
- Demo-only item 2

### Production Handoff

Later production implementation should handle:

- Real data
- Permissions
- Error fallback
- State management
- Tests
- Other:

### Self-check

- [ ] This PR is marked as draft.
- [ ] The demo entry is available or clearly described.
- [ ] The validated interactions are listed.
- [ ] Demo-only boundaries are clear.
- [ ] Production handoff notes are included.
```

## Docs PR 专用模板

用于更新工作流文档、规范、模板或检查清单。

```markdown
### Documentation Intent

Describe why this documentation update is needed.

### Documents Changed

- `path/to/doc`
- `path/to/doc`

### Document Type

- [ ] Workflow
- [ ] Tool Guide
- [ ] Standard
- [ ] Checklist
- [ ] Template

### Stability

- [ ] Long-term principle
- [ ] Current tool practice
- [ ] Team convention
- [ ] Temporary note

### Link Check

- [ ] Internal links are updated.
- [ ] File names follow naming rules.
- [ ] This doc does not duplicate another doc's responsibility.
```

## Reviewer 结论模板

Approved：

```markdown
Review result: Approved

- The PR scope is clear.
- The design intent is understandable.
- The handoff notes are sufficient.
```

Changes Requested：

```markdown
Review result: Changes requested

Please update:

- Item 1
- Item 2
- Item 3
```

Need Clarification：

```markdown
Review result: Clarification needed

Please clarify:

- Question 1
- Question 2
```

## 创建 PR 前检查

- [ ] PR 标题是否符合规范？
- [ ] PR 是否关联 Issue？
- [ ] PR 类型是否明确？
- [ ] 改动范围是否清楚？
- [ ] 是否说明不在本 PR 中处理的内容？
- [ ] Design PR 是否完成设计与资产自查？
- [ ] Demo PR 是否保持 Draft？
- [ ] 是否说明后续生产实现承接点？
- [ ] 是否检查过 `git status --short`？
