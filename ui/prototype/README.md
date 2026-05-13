# XBuilder Prototype Preview

这是一个独立的 UI 原型工程，用来预览 `ui/pages/spx/tutorial.pen` 对应的设计实现。
它保持与真实前端相近的组织方式和技术栈：基于 Vite、Vue 3、Vue Router，按页面、
组件、数据和样式拆分；但不包含业务逻辑，也不直接依赖真实前端项目。

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

- `/` 重定向到 `/tutorials`
- `/tutorials` 使用 prototype 页面，并直接引用 `ui/images` 中的设计资源
- 本地 mock 教程数据与卡片点击反馈
- 导航、banner、列表和页脚都保留为纯展示层实现

## Constraints

- 这个目录应始终可单独安装、单独启动、单独构建
- 可以复用 `ui/images` 这类设计资源，但不要直接 import 真实前端项目中的代码或配置
- 如需模拟交互，只保留用于预览 UI 的最小本地状态
