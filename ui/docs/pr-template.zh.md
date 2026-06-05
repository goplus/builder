# PR 模板

> - 文档类型：Template / PR 写作模板
> - 稳定性：随 GitHub 协作方式微调
> - 何时阅读：创建 PR、补充 PR 描述、回应评审意见前
> - 维护原则：保留 AI Agent 生成 PR 描述所需字段；不写背景解释和重复说明。

## 如何选择模板

| 模板 | 使用场景 |
| ---- | -------- |
| Design PR | 设计资产、设计意图、变更范围、自查结果。 |
| Demo PR | Demo 代码、预览入口、验证范围。默认 Draft。 |
| Docs PR | 工作流、规范、模板、检查清单。 |

## 标题

```text
[PR Type][Scope] Type: Description
```

PR Type:

```text
[Design]
[Demo]
[Docs]
```

Scope:

```text
[Page]
[Component]
[Asset]
[Workflow]
[Docs]
```

Type:

```text
Feature
Update
Fix
Chore
```

## 通用模板

```markdown
### Issue

- Related to #

### PR Type

- [ ] Design PR
- [ ] Demo PR (Draft)
- [ ] Docs PR

### Changes

-

### Scope

In scope:

-

Out of scope:

-

### Validation

- Not run (docs only).
```

## Design PR 追加字段

```markdown
### Design Intent

-

### Design Assets Changed

-

### Production Handoff

-
```

## Demo PR 追加字段

```markdown
### Demo Purpose

-

### Related Design PR

- Related to #

### Demo Entry

- Preview link:
- Route:
- Screenshot:
- Recording:

### Interaction Coverage

Validated:

-

Not validated:

-

### Demo-only Boundaries

-

### Production Handoff

-
```

## Docs PR 追加字段

```markdown
### Documents Changed

-

### Link Check

- [ ] Internal links are updated.
- [ ] File names follow naming rules.
- [ ] This doc does not duplicate another doc's responsibility.
```

## 创建 PR 前检查

- [ ] 标题符合格式。
- [ ] 已关联 Issue。
- [ ] PR 类型明确。
- [ ] Scope 写清楚。
- [ ] Validation 写清楚。
- [ ] Demo PR 保持 Draft。
- [ ] 已检查 `git status --short`。
