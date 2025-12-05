# Vue Coding Guidelines

## Menu Item Text Guidelines

When creating or modifying menu items in Vue components, follow these UI guidelines for proper use of ellipses:

### When to Use Ellipses (...)

**Use an ellipsis** when a menu item requires **additional user input or choices before the action can complete**. The ellipsis signals that users need to provide information or make decisions, typically within a dialog or modal.

Examples:
- "New project..." - Opens a dialog to input project name and settings
- "Open project..." - Opens a dialog to select which project to open
- "Import project file..." - Opens a file picker to select a file
- "Publish project..." - Opens a dialog to configure publication settings
- "Remove project..." - Opens a confirmation dialog

### When NOT to Use Ellipses

**Do not use an ellipsis** when:
1. The action executes immediately without requiring additional input
2. The action only displays information (like About, Help, Properties, Settings)
3. The action performs a direct operation (like Save, Export, Sign out)
4. The action navigates to another page without requiring input

Examples:
- "Export project file" - Directly exports without additional input
- "Open project page" - Navigates directly to the project page
- "Profile" - Navigates to user profile
- "Projects" - Navigates to projects list
- "Sign out" - Performs logout immediately
- "Language" - Opens language selection (settings-like, informational)
- "Manage sprites/sounds/backdrops" - Opens management interface (settings-like)

### Implementation in Vue

Use the `$t()` function for internationalized menu text with consistent ellipsis usage:

```vue
<!-- Requires user input - use ellipsis -->
<UIMenuItem @click="handleAction">
  {{ $t({ en: 'New project...', zh: '新建项目...' }) }}
</UIMenuItem>

<!-- Direct action - no ellipsis -->
<UIMenuItem @click="handleAction">
  {{ $t({ en: 'Export project file', zh: '导出项目文件' }) }}
</UIMenuItem>
```

### References

- [Microsoft Windows UX Guidelines - Using Ellipses](https://learn.microsoft.com/en-us/windows/win32/uxguide/cmd-menus#using-ellipses)
- [Apple Human Interface Guidelines - Menu Labels](https://developer.apple.com/design/human-interface-guidelines/menus#Labels)
