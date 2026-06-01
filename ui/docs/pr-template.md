# PR 模板（Design and Demo PR Template）

本文档定义 UI 设计研发工作流中 Design PR 和 Demo PR 的标题、描述和边界说明。它用于让同一个 issue 下的设计资产和 demo 验证能够被清晰关联。

本文档的说明文字使用中文；PR 标题、段落标题和模板正文默认使用英文，以便直接复制到 GitHub PR。

本文档不定义 Git 操作步骤，不替代设计审查清单、设计资产校验或生产代码 review。Git 操作见 [Git 协作操作指南（Git Collaboration Guide）](./git-collaboration-guide.zh.md)，设计自查见 [设计审查清单（Design Review Checklist）](./design-review-checklist.md)，设计资产校验见 [设计资产校验（Design Asset Validation）](./design-asset-validation.md)。

## PR 类型与边界

| PR 类型 | 目标分支 | 职责 | 合并语义 |
| ------- | -------- | ---- | -------- |
| Design PR | `ui` | 提交设计资产，说明设计意图、变更范围和自查结果。 | 合并前只保留应进入仓库历史的设计资产。 |
| Demo PR | `ui` | 提供 demo 代码、预览环境、截图或验证记录，用于验证关键交互和页面状态。 | 必须以 draft 状态提交或保持 draft 状态，避免 demo 代码被误合并进主分支。 |

后续生产实现可以用 Code PR 表达，用于承接本文档保留的设计和 demo 上下文；但 Code PR 不属于本文档定义的模板范围，其模板、工程质量、测试和合并规则由后续生产实现流程决定。

同一个需求应通过同一个 issue 关联 Design PR 和 Demo PR。两类 PR 可以由同一人或不同人完成，但 PR 描述必须说明当前 PR 承担的是设计资产提交还是 demo 验证。

## 标题规范

标题格式：

```text
[PR Type][Scope] Type: Description
```

| PR Type | 说明 |
| ------- | ---- |
| `[Design]` | 设计资产变更 |
| `[Demo]` | demo 验证变更 |

| Scope | 说明 |
| ----- | ---- |
| `[Page]` | 页面级变更 |
| `[Component]` | 组件级变更 |
| `[Docs]` | 文档、流程、模板或工作规则变更 |

| Type | 说明 |
| ---- | ---- |
| `Feature` | 新增设计或 demo 验证 |
| `Update` | 优化或调整现有内容 |
| `Fix` | 修复问题 |

示例：

- `[Design][Page] Feature: Add notification banner design`
- `[Demo][Page] Update: Verify notification banner interaction`
- `[Design][Docs] Update: Organize UI design workflow docs`

## 字段语义

| 字段 | 作用 |
| ---- | ---- |
| Issue | 将当前 PR 绑定到同一个需求上下文，避免设计资产和 demo 验证脱节。 |
| PR Type | 明确当前 PR 承担 Design 或 Demo 中的哪一段职责。 |
| Background | 说明为什么需要这次改动，不重复 issue 全文。 |
| Changes | 列出本 PR 实际改变了什么。 |
| Scope | 限定影响范围，帮助 reviewer 判断是否越界。 |
| Design Intent | 保留设计目标、用户路径或关键状态，供 demo 验证和后续生产实现承接。 |
| Demo Entry | 给出可体验入口，支撑 reviewer 和后续承接人员验证设计表达。 |
| Production Handoff | 说明后续生产实现需要从 demo 中承接什么，但不定义生产实现方案。 |

## 通用描述字段

Design PR 和 Demo PR 都应包含：

使用时先复制本节的通用字段，再追加当前 PR 类型对应的专属模板。只复制相关类型的专属模板，不需要把 Design PR 和 Demo PR 两段都放进同一个 PR。

```markdown
### Issue

- Related to #issue_number  <!-- 与某 issue 有关联，不自动关闭 -->
- Updates #issue_number     <!-- 完成大 issue 的部分更新，不自动关闭 -->
- Closes #issue_number      <!-- 完全解决该 issue，合并后自动关闭 -->

### PR Type

- [ ] Design PR
- [ ] Demo PR

### Background

Briefly explain why this change is needed.

### Changes

- Change 1
- Change 2

### Scope

- Affected page or component 1
- Affected page or component 2
```

只勾选当前 PR 对应的类型。若同一个 PR 同时包含设计资产提交和 demo 验证职责，应先判断是否需要拆分。

## Design PR 描述模板

Design PR 用于提交设计资产。它应说明设计意图、资产范围和自查结果，不应混入只用于 demo 的前端代码。

Design PR 不应包含：

- Demo-only frontend code.
- Unorganized temporary screenshots or exploration drafts that cannot be traced to the issue.
- Production implementation details.

```markdown
### Design Intent

Describe the problem, user path, or key state this design addresses.

### Design Assets

- `ui/components/...`
- `ui/pages/...`
- `ui/images/...`

### Design System Impact

- [ ] Yes
- [ ] No

### Design Asset Validation

Required when this PR changes `ui/**/*.pen` or `ui/images/*`.

- [ ] Checked affected `.pen` files against [Design Asset Validation](./design-asset-validation.md)
- [ ] Confirmed page `.pen` files reuse the component library instead of copying local tokens, fonts, or components
- [ ] Confirmed new or changed resources are under `ui/images/` and can be traced from the related `.pen` files
```

## Demo PR 描述模板

Demo PR 用于验证设计意图。它应说明预览入口、覆盖范围和非生产代码边界。Demo PR 必须保持 draft 状态，避免 demo 代码被误合并进主分支。

Demo PR 不应包含：

- Production business logic.
- Real permissions, persistence, or complete error handling.
- Experience exploration unrelated to the current issue.

```markdown
### Demo Entry

- Preview URL:
- Route or page:

### Interaction Coverage

- Covered key path 1
- Covered key state 2

### Production Boundary

- [ ] This PR is kept as draft to prevent demo code from being merged
- [ ] Demo code is only for validating design intent
- [ ] Real data, permissions, persistence, or error handling will be handled outside this PR

### Production Handoff

- Follow-up owner or assignee:
- Design intent or interaction that production implementation should preserve:
```
