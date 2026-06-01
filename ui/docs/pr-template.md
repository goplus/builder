# PR 模板（Design PR Template）

## 标题规范

**格式**：`[Scope] Type: Description`

| Scope         | 说明           |
|---------------|----------------|
| `[Page]`      | 页面级设计变更 |
| `[Component]` | 组件级变更     |
| `[Docs]`      | 文档、流程、模板或工作规则变更 |

| Type      | 说明               |
|-----------|--------------------|
| `Feature` | 新增功能/设计      |
| `Update`  | 优化/调整现有设计  |
| `Fix`     | 修复设计问题       |

**示例**：

- `[Page] Feature: Add notification banner design`
- `[Component] Update: Button disabled state`
- `[Docs] Update: Organize UI design workflow docs`

## 描述模板

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

### Design Asset Validation

Required when this PR changes `ui/**/*.pen` or `ui/images/*`.

- [ ] Checked affected `.pen` files against [Design Asset Validation](./design-asset-validation.md)
- [ ] Confirmed page `.pen` files reuse the component library instead of copying local tokens, fonts, or components
- [ ] Confirmed new or changed resources are under `ui/images/` and can be traced from the related `.pen` files
```

## 完整示例

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

### Design Asset Validation

- [x] Checked affected `.pen` files against [Design Asset Validation](./design-asset-validation.md)
- [x] Confirmed page `.pen` files reuse the component library instead of copying local tokens, fonts, or components
- [x] Confirmed new or changed resources are under `ui/images/` and can be traced from the related `.pen` files
```
