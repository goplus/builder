# 在 PR 中预览提交文件的操作步骤

**1. 首先切换到跟踪分支：**

`upstream/ui`（即 `goplus/builder/ui`）
-可以在桌面端打开 upstream/ui 或者 ui（这是已经点击过 upstream/ui 的情况）
-也可以选择在终端中输入 git checkout ui

**2. 拉取 PR 内容**（这一步操作是在UI分支中进行）

-git fetch upstream pull/2890/head:pr_2890
-2890（指的是 PR 编号）
-pr_2890（用于 review 的分支名，新建的分支与 PR 号绑定，方便识别）

**3. 切换到新建的分支**

-终端中输入 git checkout pr_2890
-在左侧目录中就会出现刚拉过来的 PR 文件