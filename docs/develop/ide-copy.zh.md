# XBuilder 界面文案规范

[English](./ide-copy.md)

本规范适用于 XBuilder 的所有界面文案，包括编辑器、课程和社区页面。

## 产品人格

XBuilder 的产品人格为「亦师亦友」：一位可靠的创作伙伴、一位引导学习的老师。

作为创作伙伴，XBuilder 平等沟通，提供可靠的支持，尊重用户的想法和选择；作为老师，它解释问题、引导思考，帮助用户理解，并留出自主尝试的空间。

表达风格保持一致，语气和引导程度随情境调整。

## 四个原则

- **清楚**：具体说清任务、状态、问题或操作后果，删掉重复和无关的信息。
- **可靠**：直接说已确认的事实，不把推测当成结论。
- **尊重**：把判断和选择留给用户。
- **实用**：提供用户当前任务需要的信息。需要引导时，说清可以检查什么，或接下来可以做什么。

## 案例

### 编辑器：导入项目文件

| 界面位置 | 修改前 | 修改后 |
| --- | --- | --- |
| 标题 | 导入项目文件 / Import project file | 不变 |
| 正文 | 当前项目中的内容将被导入项目文件的内容覆盖，确定继续吗？ / Existing content of current project will be replaced with imported content. Are you sure to continue? | 导入的文件内容将替换当前项目内容。 / The imported file will replace the current project’s contents. |
| 主按钮 | 继续 / Continue | 选择文件 / Choose a file |
| 次按钮 | 取消 / Cancel | 不变 |

主按钮只打开文件选择器，所以写「选择文件」。正文说明导入会替换当前项目内容，用户可以选择文件，也可以取消。

### 课程中：第 34 课反馈弹窗

松鼠已经收集到蘑菇，但代码还没有用成熟判断控制收集。

**文案结构：** 当前状态 → 未满足的本课要求（若有） → 下一步。

**中文：** 蘑菇收集到了。本课还需要用成熟判断控制收集。检查判断条件和收集动作。

**英文示例：** You collected the mushrooms. This lesson also asks you to use a ripeness check to control when the squirrel collects them. Check the condition and the collection action.

先写课程已确认的结果，再指出未满足的要求。告诉学员检查哪段代码，把怎么修改留给学员。

## 标点

- 给名称加引号时，中文用双引号 “ ”，英文用半角双引号。例如：`撤销“移动精灵”` / `Undo "Move sprite"`。
- 独立显示的完整陈述或指令加句号，短标签不加。如 `请输入项目名。` / `Enter a project name.`，以及 `删除` / `Delete`。
- 与操作失败提示拼接的错误文案不加句末标点。英文括号内的原因以小写开头，专有名词除外。例如：`Failed to load project (item not found)`。

## 菜单项文案规则

**加三个半角点（...）：** 选中菜单项后，还需要输入、选择或确认。比如「新建项目...」「打开项目...」「导入项目文件...」「发布项目...」「删除项目...」。

**不加三个点：** 选中后立即执行、跳转或只显示信息。比如「导出项目文件」「打开项目页面」「我的项目」「退出登录」，以及打开语言或素材管理界面的入口。

使用 `$t()` 提供中英文文案，例如 `{{ $t({ en: 'New project...', zh: '新建项目...' }) }}`。

参考：[Microsoft UX 指南](https://learn.microsoft.com/en-us/windows/win32/uxguide/cmd-menus#using-ellipses)、[Apple 人机界面指南](https://developer.apple.com/design/human-interface-guidelines/menus#Labels)。
