# Issue 模板

> 文档类型：Template / Issue 写作模板
> 稳定性：随 GitHub 协作方式微调
> 适用对象：创建产品设计、UI 设计、体验优化、Demo 验证相关 Issue 的协作者
> 何时使用：开始 Design PR 或 Demo PR 前，需要定义问题、背景和验收方向时
> 维护原则：说明文字使用中文；可复制到 GitHub 的模板正文默认使用英文，便于和仓库协作保持一致。

## Issue 的作用

Issue 是工作上下文的起点。

它不承载设计资产，也不承载 Demo 代码。它负责说明：

- 为什么要做这件事；
- 当前用户或产品遇到什么问题；
- 希望改善什么；
- 完成后用户能获得什么；
- 如何判断可以进入下一阶段。

一个好的 Issue 能让后续的 Design PR、Demo PR 和生产实现都围绕同一个问题推进。

## 写作原则

- 标题直接描述用户目标或体验问题，不写内部实现细节。
- 正文先说明背景，再说明问题，最后说明期望结果。
- 不把未确认的方案写成结论。
- 不把所有讨论堆进 Issue，只保留推进工作所需的信息。
- 探索型 Issue 要写清楚需要回答的问题。
- 执行型 Issue 要写清楚验收标准。
- `Expected Outcome` 应从用户视角描述完成后的状态。

## 标题格式

推荐使用：

```text
Support ...
Improve ...
Clarify ...
Fix ...
Allow users to ...
Make ... accessible ...
```

示例：

```text
Improve sprite reference point editing experience
Support collapsed state for asset panel
Clarify AI generation failed state
Allow users to return to tutorial series
```

不推荐：

```text
Update UI
Fix page
Change style
New design
```

## 字段语义

| 字段 | 作用 |
| ---- | ---- |
| Background | 提供问题发生的上下文，不写过多解决方案细节。 |
| Problem | 描述用户面对的问题或体验断点。 |
| What Needs Improvement | 说明需要改善的方向，但不提前锁死实现方式。 |
| Expected Outcome | 从用户视角描述完成后的目标状态。 |
| Product Tension | 说明探索型 Issue 中的目标、约束或取舍。 |
| Questions To Explore | 收敛当前需要回答的问题。 |
| Acceptance Criteria | 明确执行型 Issue 的验收条件。 |
| Related Materials | 补充截图、录屏、设计稿、PR、讨论链接等材料。 |

## 标准模板

适用于多数体验改进、页面优化和设计资产更新。

```markdown
## Background

Explain the current context in 1-3 short paragraphs.

## Problem

Describe the user-facing problem.

- Problem or impact 1
- Problem or impact 2
- Problem or impact 3

## What Needs Improvement

Describe what should be improved.

Possible directions include:

- Direction 1
- Direction 2
- Direction 3

## Expected Outcome

Describe the desired end state from the user's perspective.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Related Materials

- Design:
- Screenshot:
- Recording:
- Related PR:
```

## 探索型 Issue 模板

适用于方向还不完全确定，需要先通过设计或 Demo 收敛方案的问题。

```markdown
## Background

Explain why this topic needs exploration.

## Product Tension

Describe the key tension, trade-off, or uncertainty.

Examples:

- Speed vs. control
- Simplicity vs. flexibility
- Beginner-friendly guidance vs. advanced user efficiency

## Questions To Explore

- Question 1
- Question 2
- Question 3

## Expected Outcome

Describe what should become clear after exploration.

## Possible Deliverables

- [ ] Design exploration
- [ ] Design PR
- [ ] Demo PR
- [ ] Decision summary

## Related Materials

- Existing behavior:
- Reference:
- Discussion:
```

## 执行型 Issue 模板

适用于目标已经明确，重点是完成设计资产、Demo 或后续实现。

```markdown
## Background

Explain the current context and why this needs to be done.

## Scope

This issue covers:

- Scope item 1
- Scope item 2
- Scope item 3

This issue does not cover:

- Out-of-scope item 1
- Out-of-scope item 2

## Expected Outcome

Describe the expected result from the user's perspective.

## Acceptance Criteria

- [ ] The main user path is covered.
- [ ] Relevant states are defined.
- [ ] Design assets are updated if needed.
- [ ] Demo validation is provided if needed.
- [ ] Production handoff notes are clear.

## Related Materials

- Design PR:
- Demo PR:
- Screenshot:
- Recording:
```

## 产品设计工程化工作流专用字段

当 Issue 会进入 Design PR 或 Demo PR 时，建议补充：

```markdown
## Design Engineering Notes

- Design PR needed: Yes / No / TBD
- Demo PR scope: Full interaction / Lightweight validation / TBD
- Target branch: ui
- Design asset impact: None / Page / Component / Images / Docs
- Production handoff needed: Yes / No / TBD
```

## 验收标准写法

好的验收标准应具体、可判断。

推荐：

```markdown
- [ ] Users can see the full sprite name without losing the card structure.
- [ ] Hover state is defined for the sprite item.
- [ ] Empty state is defined when no assets are available.
- [ ] The Design PR links to this issue.
- [ ] The Demo PR provides a preview link if interaction validation is needed.
```

不推荐：

```markdown
- [ ] Make it better.
- [ ] UI looks good.
- [ ] Finish design.
```

## Issue 创建前检查

- [ ] 标题是否能说明问题或目标？
- [ ] 背景是否足够让别人理解为什么要做？
- [ ] 是否区分了问题和方案？
- [ ] 是否说明期望结果？
- [ ] 是否有验收标准？
- [ ] 是否说明是否需要 Design PR 或 Demo PR？
- [ ] 是否附上必要材料？
