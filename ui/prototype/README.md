# XBuilder Prototype Preview

这是一个独立的 XBuilder 前端原型工程，用来在 Design PR 阶段预览页面结构、视觉样式和基础交互。
它保持与真实前端相近的组织方式和技术栈：基于 Vite、Vue 3、Vue Router、Tailwind CSS v4，按页面、
组件、mock API、数据和样式拆分；主题 token、基础排版和字体资源尽量与真实前端保持一致，但不直接依赖真实前端项目，也不调用服务端。

## Run

```bash
npm install --ignore-scripts
npm run dev -- --host 127.0.0.1 --port 5174
```

预览地址：

```text
http://127.0.0.1:5174/
```

## Scope

- `/`、`/explore`、`/search`、`/user/:nameInput`、`/project/:ownerInput/:nameInput` 复刻社区主流程
- `/tutorials`、`/course-series/:courseSeriesIdInput`、`/course/:courseSeriesIdInput/:courseIdInput/start` 复刻教程主流程
- `/editor/:ownerNameInput/:projectNameInput/:inEditorPath*` 提供离线编辑器预览，并包含 sprite editor 局部 prototype surface
- 样式通过 Tailwind v4 utility class 实现，并在 `src/styles/app.css` 中维护与真实前端接近的 `@theme inline` token 映射
- 数据由 `src/apis/*` 和 `src/data/mock.ts` 提供，全部为本地假数据
- 导航、搜索、课程卡片跳转、项目页、编辑器局部交互均为本地状态

## Constraints

- 这个目录应始终可单独安装、单独启动、单独构建
- 可以复用 `ui/images` 这类设计资源，但不要直接 import 真实前端项目中的代码或配置
- 不要加入真实 `fetch`、`axios`、鉴权、持久化或服务端状态

## Validate

```bash
npm run test:prototype
npm run build
```
