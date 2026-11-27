# XBuilder UI Writing Guidelines

Use these guidelines for all XBuilder interface text, including the editor, courses, and community pages.

## Product voice

XBuilder is a reliable creative partner and a teacher who guides learning. As a partner, it communicates as an equal, offers reliable support, and respects users’ ideas and choices. As a teacher, it explains problems, guides thinking, and leaves room for users to try on their own.

Keep the voice consistent. Adjust the tone and level of guidance to the situation.

## Four principles

- **Clear:** State the task, status, problem, or consequence in concrete terms. Remove repeated or irrelevant information.
- **Reliable:** State what you can verify. Don’t present assumptions as facts.
- **Respectful:** Leave decisions and choices to the user.
- **Useful:** Give users what they need for the task at hand. When guidance is needed, say what they can check or do next.

## Examples

### Editor: Import a project file

| UI element | Before | After |
| --- | --- | --- |
| Title | 导入项目文件 / Import project file | Unchanged |
| Body | 当前项目中的内容将被导入项目文件的内容覆盖，确定继续吗？ / Existing content of current project will be replaced with imported content. Are you sure to continue? | 导入的文件内容将替换当前项目内容。 / The imported file will replace the current project’s contents. |
| Primary button | 继续 / Continue | 选择文件 / Choose a file |
| Secondary button | 取消 / Cancel | Unchanged |

The primary button opens a file picker; it doesn’t import immediately. Name that action on the button. Explain in the body that importing replaces the current project’s contents, then let the user choose a file or cancel.

### Course: Feedback during Lesson 34

The squirrel has collected the mushrooms, but the learner’s code doesn’t yet check whether a mushroom is ripe before collecting it.

**Structure:** Current result → unmet lesson requirement (if any) → next step.

**Chinese:** 蘑菇收集到了。本课还需要用成熟判断控制收集。检查判断条件和收集动作。

**English example:** You collected the mushrooms. This lesson also asks you to use a ripeness check to control when the squirrel collects them. Check the condition and the collection action.

Start with the result the course verified, then explain what is still missing. Point learners to the relevant code without giving them the answer.

## Punctuation

- When quoting a name, use “ ” in Chinese and straight double quotes in English. For example: `撤销“移动精灵”` / `Undo "Move sprite"`.
- End complete statements and instructions presented on their own with a period. Don’t add periods to short labels. For example: `请输入项目名。` / `Enter a project name.` and `删除` / `Delete`.
- Error messages that are combined with an action summary must work as part of the combined message. Omit terminal punctuation in these strings. In English, start a parenthetical reason lowercase unless it begins with a proper noun. For example: `Failed to load project (item not found)`.

## Menu Item Text Guidelines

When creating or modifying menu items, follow these UI guidelines for ellipses:

**Use ellipsis (...)** when the action requires additional user input before completing (opens dialog/modal for input):
- "New project..." - Opens dialog for project details
- "Open project..." - Opens dialog to select project
- "Import project file..." - Opens file picker
- "Publish project..." - Opens dialog for settings
- "Delete project..." - Opens confirmation dialog

**No ellipsis** when the action executes immediately or only displays information:
- "Export project file" - Exports directly
- "Open project page" - Navigates directly
- "Profile", "My projects", "Sign out" - Direct actions
- "Language", "Manage sprites/sounds/backdrops" - Settings/info windows

Use `$t()` for i18n: `{{ $t({ en: 'New project...', zh: '新建项目...' }) }}`

Refs: [MS UX](https://learn.microsoft.com/en-us/windows/win32/uxguide/cmd-menus#using-ellipses), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/menus#Labels)
