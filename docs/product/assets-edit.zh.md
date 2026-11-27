# 素材编辑

在 XBuilder 中，我们允许用户修改当前 [Project](./index.zh.md#项目-project) 中已有素材的内容，如 Costume 与 Backdrop 的图像、Animation 的画面、Sound 的音频等。

## 功能

* Sprite 编辑
  - Costume
    + 直接编辑（规划中）：裁剪画面、调整图片大小与偏移等
    + AI 编辑：整体或局部修改造型画面
  - Animation
    + AI 编辑（规划中）：调整动画动作或局部画面
* Backdrop 编辑
  - AI 编辑：整体或局部修改背景画面
* Sound 编辑
  - 直接编辑：裁剪音频、调整音量并试听
  - AI 编辑（规划中）：修改语音、音效或背景音乐内容

## 基本概念

编辑方式有两种：直接编辑和 AI 编辑。

### 直接编辑

用户用编辑器工具修改内容或配置，修改直接生效。

### AI 编辑

AI 编辑根据修改要求生成新版本，任务状态与额度规则同 [Asset Generation](./assets-gen.zh.md#素材生成-asset-generation)。每次成功的 AI 编辑都会生成一版草稿 Draft，采用后才生效。Draft 包含以下信息：

* Input: 输入，包括本次修改所基于的版本和修改要求
* Result: 结果，生成的完整目标对象

从对某个对象发起第一次 AI 编辑开始，到采用或放弃为止，我们称之为一轮编辑。一轮编辑包含以下信息：

* Original: 原始版本，本轮编辑开始前的对象
* Drafts: Draft 列表，按生成顺序排列
* Selected: 当前选中的版本，可以是 Original 或 Drafts 中的一版

## 核心机制

### AI 编辑的输入与输出

AI 编辑的输入包括：

* Selected: 当前选中的版本
* 修改要求：可以针对整体，也可以指定一处或多处局部位置分别说明
* 上下文：当前 Project Setting，以及目标对象或所属 Sprite 的 Asset Setting

生成新的媒体内容后，与之配套的配置随之更新：

* Costume：更新分辨率和参考点（Pivot），使造型在舞台上的显示大小和对齐位置不变
* Animation：更新 Duration

### 草稿保存

* 采用或放弃之前，Draft 和进行中的 AI 编辑任务随 [Project](./index.zh.md#项目-project) 保存，项目拥有者再次打开 Project 时可以恢复
* 所属 Sprite 被删除时，其中的 Draft 和进行中的任务一并清除，撤销删除也不会恢复

### 草稿回退

* 用户可以切换 Selected，预览 Original 或任意一版 Draft
* 新的 AI 编辑基于 Selected 进行，Selected 之后已有的 Draft 会被新结果替换

### 采用与放弃

用户可以用 Selected 替换原对象（可以撤销），也可以放弃本轮修改。两者都会结束本轮编辑并清除 Draft。

### Asset Setting 同步

对象内容被修改后（直接编辑保存或采用 Draft），我们会在后台更新对应的 [Asset Setting](./assets-gen.zh.md#素材设定-asset-setting)，使后续生成和保存到素材库时使用的描述与当前内容一致：

* Backdrop、Sound：按当前内容更新；原本没有 Asset Setting 的（如本地上传的文件）补充一份
* Sprite：Asset Setting 只记录其下各 Costume 和 Animation 共有的特征，在子项被编辑或增删后：
  - 所有子项都变化的特征随之更新
  - 彼此不再一致的特征改为更宽泛的描述
  - 原有子项全部被替换时，按新内容重新生成

## User Story

### 裁剪并试听录音

用户录制一段角色配音并添加为 Sound 后：

1. 试听 Sound，发现开头有空白且音量偏小
2. 裁去开头的空白，调高音量
3. 重新试听，确认效果后保存

### 用 AI 修改角色造型并继续生成动作

以一个设定为“戴红围巾的狐狸”的 Sprite 为例，用户把默认 Costume 的围巾改成绿色的过程如下：

1. 打开默认 Costume，输入修改要求“把围巾改成绿色”，生成第一版 Draft
2. 继续修改，生成第二版 Draft
3. 关闭页面；之后重新打开 Project，两版 Draft 仍在
4. 切回第一版 Draft 重新生成，新结果替换原来的第二版
5. 采用满意的一版，Sprite 换上新造型，角色在舞台上的显示大小和对齐位置不变
6. Sprite 的 Asset Setting 随之更新：
   - 如果造型中红围巾和绿围巾都有，设定更新为“戴围巾的狐狸”
   - 如果所有造型都已换成绿围巾，设定更新为“戴绿围巾的狐狸”
7. 之后为该 Sprite 生成跑步 Animation 时，会基于更新后的设定和新造型
