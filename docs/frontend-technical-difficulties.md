# 前端-技术难点

# 框架选型

React

Monaco Editor 的 React 组件更新较快

Vue

团队技术栈都为 Vue

# 文本编辑器

Web IDE 相关技术选型，对于前端相关技术选型主要包括[输入/语法检查/高亮/格式化/折叠/...](https://uestc.feishu.cn/docx/GqyrdSW1YoHFMLxdviIcJWNznJb#part-V2lYdiOVto5YKIxt38OciL5InTg)、[本地保存](https://uestc.feishu.cn/docx/GqyrdSW1YoHFMLxdviIcJWNznJb#part-Dp2Kd6081oxGG4xlYFucwrPan0g)、[格式化](https://uestc.feishu.cn/docx/GqyrdSW1YoHFMLxdviIcJWNznJb#part-IPLAdToM6oaQJVx0whpcOmA0npe)等功能，云端保存为后端技术。

## 输入/语法检查/高亮/格式化/折叠/...

##### CodeMirror 26.4k🌟

- 功能：CodeMirror 是一个灵活的文本编辑器库，支持语法高亮、语法检查和丰富的扩展。
- 语法高亮：提供了广泛的语法高亮支持，适用于多种编程语言。
- 语法检查：可以整合第三方语法检查工具，如 ESLint 、TSLint 。
- 扩展性：支持插件和模式，可通过自定义插件实现额外的功能。
- 格式化：CodeMirror 本身并没有内建的代码格式化功能，但可以与代码格式化工具（如 Prettier）集成，实现代码格式化。
- 版本：但是 dev 版本还不完善，对主流框架支持可能存在问题。

##### Monaco Editor 36.8k🌟

- 功能：Monaco Editor 是 Visual Studio Code 使用的编辑器组件，支持语法高亮、智能代码补全等功能。
- 语法高亮：提供丰富的语法高亮。
- 语法检查：可通过整合 ESLint 或 TSLint 实现。
- 格式化：Monaco Editor 本身没有内建的代码格式化功能，但可以与代码格式化工具（如 Prettier）结合使用，通过调用格式化工具实现代码格式化。

React

[GitHub - react-monaco-editor/react-monaco-editor: Monaco Editor for React.](https://github.com/react-monaco-editor/react-monaco-editor)  3.5k🌟

> 非官方，目前更新为 18 天前

Vue

[GitHub - egoist/vue-monaco: MonacoEditor component for Vue.js](https://github.com/egoist/vue-monaco) 0.6 🌟

> 非官方，

##### Ace Editor 26.1k🌟

- 功能：Ace Editor 是一个轻量级代码编辑器，支持语法高亮、代码折叠等功能。
- 语法高亮：提供广泛的语法高亮支持。
- 语法检查：可以整合 ESLint 等插件。
- 格式化：Ace Editor 本身没有内建的代码格式化功能，但可以与代码格式化工具结合使用，实现代码格式化。

##### 最终选型：**Monaco Editor**

- 功能丰富：Monaco Editor 是 Visual Studio Code 使用的编辑器组件，提供语法高亮、智能代码补全等功能，适用于构建功能强大的代码编辑器。
- 广泛支持：作为 VS Code 核心组件，Monaco Editor 得到了广泛的应用和支持，有强大的社区和活跃的维护。
- 跨平台：跨平台性较好，适用于 Web 平台和 Electron 等桌面应用。

## 本地保存

##### LocalForage.js 23.6k🌟

- 功能：LocalForage.js 是一个简化浏览器本地存储的库，提供 IndexedDB、WebSQL 和 localStorage 的封装。
- 本地存储：提供简单易用的 API，使得在浏览器中进行本地数据存储变得方便。
- 异步操作：支持异步操作，适应大规模或频繁读写的场景。
- 跨浏览器支持：封装了多个本地存储引擎，确保在不同浏览器上具有良好的兼容性。

##### Dexie.js 10.2k🌟

- 功能：Dexie.js 是一个基于 IndexedDB 的封装库，用于客户端数据库操作。
- 本地存储：提供了对 IndexedDB 更强大的抽象，支持复杂的查询和事务。
- 异步操作：支持异步操作，适用于处理大规模数据。

##### LocalStorage/SessionStorage

- 功能：原生的浏览器本地存储方案。
- 本地存储：提供简单的键值对存储，但容量有限。
- 同步操作：对大规模数据存储不够高效。

##### IndexedDB

- 功能：IndexedDB 是浏览器端的本地数据库，提供了对客户端存储大量结构化数据的能力。
- 本地存储：提供了一个类似关系型数据库的存储机制，支持事务操作。
- 异步操作：使用异步 API，适应大规模或频繁读写的场景。
- 容量：具备较大的存储容量，相比 localStorage 更适合存储大量数据。

##### 最终选型：**LocalForage.js**

- 简化本地存储：LocalForage.js 提供了对 IndexedDB、WebSQL 和 localStorage 的简化封装，使得在浏览器中进行本地数据存储更加方便。
- 异步操作：支持异步操作，适应大规模或频繁读写的场景，具备良好的性能。
- 跨浏览器支持：封装了多个本地存储引擎，确保在不同浏览器上具有良好的兼容性。

## 格式化

##### Prettier 47.5k🌟

- 功能：Prettier 是一个代码格式化工具，支持多种编程语言，能够自动格式化代码风格。
- 一致的代码风格：确保项目中所有代码都遵循相同的代码规范。
- 易配置：支持大量配置选项，以适应不同项目的需求。

##### 最终选型：**Prettier**

- 一致的代码风格：Prettier 确保项目中所有代码都遵循相同的代码规范，有助于维护代码的一致性。
- 易配置：Prettier 提供大量配置选项，以适应不同项目的需求，配置灵活，易于集成到各种项目中。

# 块/图形化编辑器

## 块编程基础能力

### 1.1 Blockly

React 0.2k🌟

- **功能**：用户可以通过拖拽模块，将不同的基础逻辑封装为类似积木的图形，并实时的转换为 spx 的文本文件
- **可定制性**：开发者可以定义自己的块、字段和输入
- **国际化**：支持多语言的配置
- **性能：**界面基于 Canvas 及 web 端的 svg 操作性能高

## 可视化素材操作

### 2.1 fabric.js

- 基础**功能：**用户可以对 canvas 进行拖拽，缩放，旋转，用户可以对拖拽进行 xy 轴的限制
- **事件**：支持事件系统
- **移动端支持**
- **序列化**：支持与 json，svg 的互相转换
- **基础图形**：[矩形，](http://fabricjs.com/docs/fabric.Rect.html)圆形，椭圆形，三角形，线段，折线，多边形
- **文本编辑**：文本框除了基础功能也可以编辑
- **模板：**支持复制粘贴
- typescript 支持较差
- 代码包体 308kb

### 2.2 konva.js

[文档](http://konvajs-doc.bluehymn.com/docs/index.html)

- 基础功能：如 fabricjs 类似
- 概念较多
- 基于 typescript
- 代码包体 150kb
- 支持图片缓存
- 官方文档详细，博客分享较少

##### 最终选型：**fabric.js**

目前需要交互的内容仅需要基础能力，素材并不会出现过多以至于性能问题，fabric.js 的概念较少，更易于基础能力的开发

# 目录结构/项目管理

根据调研，目前**没有**与目录相关的库，如果要读取本地项目**目录**，可参考相关 [Web API](https://uestc.feishu.cn/docx/GqyrdSW1YoHFMLxdviIcJWNznJb#H150dX26BoHTrZxuZAmclDbvnTd)。

# ~~素材管理~~

~~基础的 CRUD 操作，无技术难点。~~

# 闯关游戏

## 新手指引

##### Driver.js 19.9k🌟

- 轻量级：是一个相对轻量级的库，有助于保持页面性能。
- 配置项：提供配置项的书写方式，可以通过这些选项进行引导外观和行为的定制。

##### Intro.js 22.4k🌟

- 简单易用：Intro.js 仍然是一个简单易用的库，适合初学者。它提供了一种直观的方式来定义引导步骤。
- 轻量级：Intro.js 同样是一个轻量级的库，容易集成到项目中。
- 定制性强：提供了选项和回调函数，使得开发人员可以定制新手指引的外观和行为。
- 商业化：商业化须付费获得商业许可证。

##### Shepherd 11.7k🌟

- 灵活性：Shepherd.js 提供了灵活的 API 和丰富的选项，使得开发人员能够创建高度定制的新手指引。
- 对 SPA 的支持：Shepherd.js 对于单页应用程序（SPA）有较好的支持，对框架（Vue，Angular 等）也有较好的支持。
- 支持多语言：提供多语言支持，适应不同用户的本地化需求。

##### 最终选型：**Driver.js**

- 商业化：Driver.js 可以免费使用在商业项目上，Intro.js 需要付费。
- 易配置：Driver.js 提供大量配置选项，简单易用，配置灵活，易于集成到各种项目中。

## 关卡设计

技术难点参考[文本编辑器](https://uestc.feishu.cn/docx/GqyrdSW1YoHFMLxdviIcJWNznJb#BR3qddARroJu7jxhuj0cexu4nuf)，[块编辑器](https://uestc.feishu.cn/docx/GqyrdSW1YoHFMLxdviIcJWNznJb#OGoudSbR3oRYIYxHStucYbuBnJh)，[SPX 的 Web 渲染](https://uestc.feishu.cn/docx/GqyrdSW1YoHFMLxdviIcJWNznJb#QpQldQFGro7s1Jx8JOUcWEkynfX)。

## 游戏开发编辑器

技术难点同[文本编辑器](https://uestc.feishu.cn/docx/GqyrdSW1YoHFMLxdviIcJWNznJb#BR3qddARroJu7jxhuj0cexu4nuf)，是文本编辑器的增强版本。

# 社区

> 与 Team 小组 1 沟通后决定

# ~~换肤~~

~~CSS~~~~变量，技术难度不高~~

# **SPX 在 Web 端的渲染能力**

#### 目前功能

目前 Web 端的 [demo](https://uestc.feishu.cn/docx/GqyrdSW1YoHFMLxdviIcJWNznJb#part-RYw0diYtgolgI4xlfIlckLftnfb) 是基于 wasm 来渲染到 Web 页面

#### 目前缺陷

- wasm 文件大，加载慢
- 使用 wasm 进行预览，则不可能做到实时预览，流程会变成，SPX 代码--> 后端 Go+ 编译代码--> 组成 wasm--> 返回前端执行，目前看来这个流程非常长

#### 目标功能

- 用户可以做到进入页面即直接播放/交互
- spx 在 web 端独立的运行时

#### 需要了解/思考的内容

- wasm 渲染到 canvas 的流程
- 是否有更优的渲染为 web 页面的方式
- 目前 wasm 渲染的方式是否为通过 webgl 渲染，还是其他的方式

#### 已知内容

- 用户编写的 Spx 文件编译为 go 文件，调用 spx 库的对本地 opengl 的部分封装完成绘制界面

#### 问题：

1. 目前 Web 端的 [demo](https://uestc.feishu.cn/docx/GqyrdSW1YoHFMLxdviIcJWNznJb#part-RYw0diYtgolgI4xlfIlckLftnfb) 为直接加载编译完成的 wasm，在获取 wasm 后再交由前端的 webgl 渲染输出到 canvas，整个流程过长
2. 给 web 端 wasm 的是否有优化的空间，减小包体的计划
3. spx 是否有编译成 js 操作 canvas 的可能

#### 方向

1. spx->go->gopherjs->js->canvas

### Widget

- 需要给社区使用的一个在线运行能力，可参考公开课学习 reuse 部分

流程

gopherjs 编译 go+ 编译器打包成 js

# 参考资料

[Weather :: spx examples](https://goplus.qiniu.com/spx/weather/)  web 端 demo

[孙其瑞：Go+ STEM 引擎基础以及动画机制丨 Go+ 公开课 • 第 3 期](https://mp.weixin.qq.com/s/_0uGn0QZHIt4ZcVuBJaPfw)  SPX 引擎实现

[Go+ 公开课 · 第 11 期 ｜Go+ Spx 引擎坐标与绘制体系详解_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1t3411a7br/?vd_source=dcfdc3cfaea0a7dfda6b7b60d12f1c6c)
