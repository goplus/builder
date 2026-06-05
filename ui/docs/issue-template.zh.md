# Issue 模板

> - 文档类型：Template / Issue 写作模板
> - 稳定性：随 GitHub 协作方式微调
> - 何时阅读：创建产品设计、UI 设计、体验验证相关 Issue 前
> - 维护原则：保留 AI Agent 生成 Issue 所需字段；不写背景解释和重复说明。

## 如何选择模板

| 模板 | 使用场景 |
| ---- | -------- |
| 标准模板 | 问题清楚，需要说明改善方向。 |
| 探索型 Issue | 方向不确定，需要先回答产品或设计问题。 |
| 执行型 Issue | 目标明确，需要完成设计资产、Demo 或后续实现。 |

## 标题

```text
Support ...
Improve ...
Clarify ...
Fix ...
Allow users to ...
Make ... accessible ...
```

## 标准模板

```markdown
## Background

-

## Problem

-

## What Needs Improvement

-

## Expected Outcome

-

## Acceptance Criteria

- [ ]
```

## 探索型 Issue 模板

```markdown
## Background

-

## Product Tension

-

## Questions To Explore

-

## Expected Outcome

-

## Possible Deliverables

- [ ] Design exploration
- [ ] Design PR
- [ ] Demo PR
- [ ] Decision summary
```

## 执行型 Issue 模板

```markdown
## Background

-

## Scope

In scope:

-

Out of scope:

-

## Expected Outcome

-

## Acceptance Criteria

- [ ]
```

## 可选字段

```markdown
## Design Engineering Notes

- Design PR needed: Yes / No / TBD
- Demo PR scope: Full interaction / Lightweight validation / TBD
- Target branch: ui
- Design asset impact: None / Page / Component / Images / Docs
- Production handoff needed: Yes / No / TBD

## Related Materials

- Design:
- Screenshot:
- Recording:
- Related PR:
```

## 创建 Issue 前检查

- [ ] 标题说明问题或目标。
- [ ] 背景、问题、期望结果清楚。
- [ ] 验收标准可判断。
- [ ] Design PR / Demo PR 信息只在需要时填写。
- [ ] 相关材料只在已有时填写。
