---
applyTo: '**/*.vue'
---

Apply the [general coding guidelines](./general-coding.instructions.md) to all code.

Here are instructions for Vue Component development in spx-gui:

* Generate accessibility info for interactive elements using `v-radar` directive.

## Menu Item Text Guidelines

When creating or modifying menu items, follow these UI guidelines for ellipses:

**Use ellipsis (...)** when the action requires additional user input before completing (opens dialog/modal for input):
- "New project..." - Opens dialog for project details
- "Open project..." - Opens dialog to select project
- "Import project file..." - Opens file picker
- "Publish project..." - Opens dialog for settings
- "Remove project..." - Opens confirmation dialog

**No ellipsis** when the action executes immediately or only displays information:
- "Export project file" - Exports directly
- "Open project page" - Navigates directly
- "Profile", "Projects", "Sign out" - Direct actions
- "Language", "Manage sprites/sounds/backdrops" - Settings/info windows

Use `$t()` for i18n: `{{ $t({ en: 'New project...', zh: '新建项目...' }) }}`

Refs: [MS UX](https://learn.microsoft.com/en-us/windows/win32/uxguide/cmd-menus#using-ellipses), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/menus#Labels)
