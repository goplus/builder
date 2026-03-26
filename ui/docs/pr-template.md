# Design PR Template

## 标题规范

**格式**：`[Scope] Type: Description`

| Scope         | 说明           |
|---------------|----------------|
| `[UI]`        | 页面级设计变更 |
| `[Component]` | 组件级变更     |

| Type      | 说明               |
|-----------|--------------------|
| `Feature` | 新增功能/设计      |
| `Update`  | 优化/调整现有设计  |
| `Fix`     | 修复设计问题       |

**示例**：

- `[UI] Feature: Add notification banner design`
- `[Component] Update: Button disabled state`

## 描述模板

```markdown
### Issue

- update #issue_number  <!-- 完成大 issue 的部分更新 -->
- ref #issue_number     <!-- 与某 issue 有关联 -->
- close #issue_number   <!-- 完全解决该 issue -->

### Background

简述修改原因。

### Changes

- 变更点 1
- 变更点 2

### Scope

- 影响页面/组件 1
- 影响页面/组件 2

### Design System Impact

- [ ] Yes (requires Component PR)
- [ ] No
```

## 完整示例

```markdown
[UI] Feature: Add notification banner design

### Issue

update #2575

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
