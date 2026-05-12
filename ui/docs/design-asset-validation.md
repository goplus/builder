# Design Asset Validation

本文档记录 `ui/` 设计资产的校验与保护机制。

## 适用范围

设计资产校验主要覆盖：

- `ui/components/spx/builder-component.lib.pen`
- `ui/pages/spx/*.pen`
- `ui/images/*` 中被 `.pen` 文件引用的字体和图片资源

对应测试位于：

```text
ui/tests/pen/design-asset-conformance.test.ts
```

## 校验目标

设计资产校验用于防止 `.pen` 文件回退到历史不规范状态。

主要检查：

- 组件库 token 是否与前端代码主源保持一致。
- 页面级 `.pen` 是否优先引用组件库，而不是复制局部 token、字体或 path。
- 旧字体、旧 icon font 和旧 token namespace 是否已移除。
- 活跃页面 `.pen` 是否保持轻量，只承担页面拼装职责。

## 手动校验

在仓库根目录运行：

```bash
npm --prefix spx-gui run test -- --root .. --no-cache ui/tests/pen/design-asset-conformance.test.ts --run
```

如果当前 `spx-gui` 依赖未安装，需要先安装依赖。只修复依赖时使用：

```bash
npm install --ignore-scripts
```

避免普通 `npm install` 触发 `postinstall` 下载运行时资源。

## 组件库快照

为降低 `builder-component.lib.pen` 本地误操作或异常退出导致的数据丢失风险，仓库提供组件库快照机制。

常用命令在 `spx-gui/` 目录执行：

```bash
npm run snapshot:pen
npm run watch:pen-snapshot
```

- `snapshot:pen`：手动创建一次组件库快照。
- `watch:pen-snapshot`：监听组件库文件变更，并持续写入快照。

快照目录：

```text
ui/components/spx/.snapshots/
```

快照只用于恢复和排查，不参与当前设计主源判断。

## Git Hook

仓库提供提交前校验。首次使用前在 `spx-gui/` 目录运行：

```bash
npm run setup:githooks
```

安装后，每次提交只要包含 staged 的 `ui/**/*.pen` 文件，就会执行设计资产校验。

如果 staged 文件包含 `ui/components/spx/builder-component.lib.pen`，hook 还会额外创建一次组件库快照。

也可以手动运行提交前校验：

```bash
npm run validate:pen
```

## 维护原则

- 测试文件应保留在 `ui/tests/pen/`，因为它验证的是 `ui/` 下的设计资产。
- 不要把设计资产测试放入 `spx-gui/src`，它不是前端业务单元测试。
- 不要修改 `.snapshots` 来伪造设计资产已对齐。
- 如果测试失败，应优先修正活跃 `.pen` 文件、组件库 token 或引用关系。
