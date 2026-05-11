# XBuilder Prototype Preview

基于真实 `spx-gui` 前端预览环境启动，只覆盖 `/tutorials` 路由为
`ui/pages/spx/tutorial.pen` 对应的 prototype 实现。其他路由、组件、样式、env、
API proxy、widgets 和 server headers 都继承 `spx-gui/vite.config.ts`。

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

- `/tutorials` 使用 prototype 页面
- 其他页面继续使用 `spx-gui/src/pages/**`
- 本地 mock 教程数据、搜索过滤与卡片点击反馈

Pencil MCP 已恢复，本版按 `tutorial.pen` 的首页结构同步：顶部导航、banner、12
张教程卡片和设计 token。
