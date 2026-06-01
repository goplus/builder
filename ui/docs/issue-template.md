# Issue 模板（Issue Template）

本文档的说明文字使用中文；issue 标题、段落标题和模板正文默认使用英文，以便直接复制到 GitHub issue。

## 文档范围

本文档定义 GitHub issue 的标题、字段语义和正文模板，用于让设计问题、体验目标、探索方向和验收条件在进入 Design PR 或 Demo PR 前保持清晰。

## 非目标

本文档不定义 PR 标题与描述格式，不定义 Git 操作步骤，也不替代产品需求文档、设计资产规范或后续生产实现方案。

## 写作原则

- 标题直接描述用户目标或需要改善的体验，不写内部实现细节。
- 正文先说明背景，再说明问题，最后说明期望结果。
- 只写对理解和推进 issue 有帮助的信息，不扩写无关细节。
- 如果需求还不确定，重点写清楚需要探索的问题。
- 如果需求已经明确，重点写清楚用户问题、改进方向和验收标准。
- `Expected Outcome` 必须从用户视角描述完成后能做到什么。

## 标题格式

优先使用下面这类表达：

- `Support ...`
- `Improve ...`
- `Make ... accessible ...`
- `Allow users to ...`
- `Clarify ...`
- `Fix ...`

## 字段语义

| 字段 | 作用 |
| ---- | ---- |
| Background | 提供问题发生的上下文，不写解决方案细节。 |
| Problem | 描述用户面对的问题或体验断点。 |
| What Needs Improvement | 说明需要改善的方向，但不提前锁死实现方式。 |
| Expected Outcome | 从用户视角描述完成后的状态。 |
| Product Tension | 说明探索型 issue 中的目标、约束或取舍。 |
| Questions To Explore | 收敛当前需要回答的问题，避免把不确定内容写成结论。 |
| Acceptance Criteria | 用于明确执行型 issue 的验收条件。 |

## 标准模板

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
```

## 探索型 Issue

当需求涉及长期能力、产品策略或方案取舍时，使用这个版本：

```markdown
## Background

Explain the current context and long-term goal.

## Product Tension

Explain the tradeoff or constraint.

- Goal / constraint 1
- Goal / constraint 2

## What This Issue Is About

Describe what should be explored or defined.

- Topic 1
- Topic 2
- Topic 3

## Why It Matters

Explain why this matters for users or for the product.

## Questions To Explore

- Question 1
- Question 2
- Question 3

## Expected Outcome

Describe the product or technical decision that should come out of this issue.
```

## 明确执行型 Issue

当问题已经明确、可以直接设计或开发时，使用这个版本：

```markdown
## Background

Explain the current UI, workflow, or behavior.

## Problem

- User-facing problem 1
- User-facing problem 2
- User-facing problem 3

## What Needs Improvement

- Improvement 1
- Improvement 2
- Improvement 3

## Expected Outcome

Users should be able to ...

## Acceptance Criteria

- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3
```

## 使用规则

使用本文模板编写 issue 时，应按下面顺序处理：

1. 判断需求是探索型还是明确执行型。
2. 生成一个清晰的英文标题。
3. 使用对应模板生成英文正文。
4. 如果用户提供了截图、页面、组件或文件路径，把它放进 `Background` 或 `Problem`。
5. 如果用户没有提供足够信息，不要编造具体实现；用 `Possible directions include` 或 `Questions To Explore` 承接不确定部分。
6. 输出最终 issue 内容即可，不需要解释模板选择过程。
