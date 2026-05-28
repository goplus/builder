# Design PR Template

## 标题规范

常规设计 PR 使用：

```text
[Scope] Type: Description
```

| Scope         | 说明           |
|---------------|----------------|
| `[Page]`      | 页面级设计变更 |
| `[Component]` | 组件级变更     |
| `[Docs]`      | 文档、流程、模板或 skill 变更 |

| Type      | 说明               |
|-----------|--------------------|
| `Feature` | 新增功能/设计      |
| `Update`  | 优化/调整现有设计  |
| `Fix`     | 修复设计问题       |

**示例**：

- `[Page] Feature: Add notification banner design`
- `[Component] Update: Button disabled state`
- `[Docs] Update: Organize UI design workflow docs`

## Draft PR 标题

如果 PR 是预期暂不合并的 demo / prototype / 临时方案，标题使用：

```text
[Draft] Type: Description
```

有 `[Draft]` 时不要再加 `[Page]` / `[Component]` / `[Docs]`，避免标题前缀过长。

**示例**：

- `[Draft] Feature: Add animation sound playback selector demo`
- `[Draft] Update: Prototype sound generation flow`

这类 PR 需要保持 GitHub Draft 状态，避免被误合并。

## 描述模板

常规 PR：

```markdown
### Issue

- Related to #issue_number  <!-- 与某 issue 有关联，不自动关闭 -->
- Updates #issue_number     <!-- 完成大 issue 的部分更新，不自动关闭 -->
- Closes #issue_number      <!-- 完全解决该 issue，合并后自动关闭 -->

### Background

简述修改原因。

### Changes

- 变更点 1
- 变更点 2

### Scope

- 影响页面/组件 1
- 影响页面/组件 2

### Design System Impact

- [ ] Yes
- [ ] No
```

Draft / demo / prototype PR：

```markdown
[skip review]

This is a frontend-only UI demo PR and is expected to stay in draft until the related implementation flow lands.

### Issue

Updates #issue_number

### Background

简述 demo / prototype 的目标，以及为什么当前 PR 暂不作为最终可合并实现。

### Changes

- 变更点 1
- 变更点 2

### Scope

- 影响页面/组件 1
- 明确不包含的后端、导出、持久化或生产逻辑

### Design System Impact

- [ ] Yes
- [ ] No
```

## 完整示例

常规 PR：

```markdown
[Page] Feature: Add notification banner design

### Issue

Updates #2575

### Background

Remind users to refresh page for latest version.

### Changes

- Added notification banner component
- Integrated with version check API

### Scope

- Community homepage
- All authenticated pages

### Design System Impact

- [ ] Yes
- [x] No
```

Draft PR：

```markdown
[Draft] Feature: Add animation sound playback selector demo

[skip review]

This is a frontend-only UI demo PR and is expected to stay in draft until the related model/export flow lands.

### Issue

Updates #3214

### Background

Animation sound binding needs a UI demo so users can choose whether a selected sound plays once independently or follows animation playback.

### Changes

- Added playback behavior selection to the animation sound selector.
- Adjusted the sound selector panel states based on the design.
- Kept the implementation frontend-only by using existing animation sound state.

### Scope

- Animation sound selector
- Animation settings summary bar
- Does not include backend, export, or persistence logic

### Design System Impact

- [ ] Yes
- [x] No
```
