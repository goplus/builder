# 设计 PR 模板

## 1️⃣ PR 标题规范

> 使用英文

[UI] Feature: Modify the username and display name
[Design-System] Update: Button disabled state
[Template] Update: Sprite config

## 2️⃣ PR 描述必须包含

### 关联issues

-最常用的是 update #issue编号 （代表完成大 issue 的小更新改动）
-ref #issue编号 （代表与某个 issue 有逻辑关联）
-close #issue编号 （代表关闭某个 issue ，这通常是前端用的指令）

### 背景

为什么改？

### 修改内容

- 调整按钮 padding
- 修改错误提示颜色

### 影响范围

- 产品登录页
- 主要按钮

### 是否影响设计系统

- [x] 是（需要 design system PR）
- [ ] 否

## 3️⃣ PR 内容必须包含

- [ ] Pencil 文件（含设计稿高保真 & 交互说明）
- [ ] 演示 Demo

# 提交注意事项

- 改动中涉及到icon改动的需要单独在需求文件夹中新建一个icon文件，把svg格式的icon放进去一起提交 (待和前端商议)