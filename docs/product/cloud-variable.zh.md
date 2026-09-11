# 云变量（Cloud Variable）

云变量是 XBuilder 中让运行同一项目的每个用户将个人状态持久化到云端的功能。只要在代码里绑定一个变量，运行时就会自动把 `<当前运行用户>/<项目>/<变量名称>` 组成的唯一键同步到服务器，实现跨设备、跨时间的进度或偏好保留。

该能力面向正在学习编程的用户，提供与 spx 风格一致的 API：无需管理网络请求或存储细节，只需调用 `cloud.bind` 等函数即可。

## 基本概念

### 云变量（Cloud Variable）

- 由开发者在代码里声明和绑定。
- 存储键由运行项目的用户 ID、项目名和变量名称三部分组成。
- 仅对绑定者本人可见；不同用户运行同一项目时会各自获得独立的数据副本。

### 变量名称（Name）

- 开发者在 `cloud.bind` 时传入的字符串。
- 允许重复；真正的唯一性由“三元键”保证。
- 建议使用语义化名称，便于在日志和 UI 中识别。

### 运行用户（Runtime User）

- 当前登录并执行项目的用户。
- 每次同步都会携带其 ID，从而让相同项目在不同账号下拥有独立云变量。

### 同步（Sync）

- 指本地值与云端值的双向更新。
- 默认在绑定、变量变化和网络恢复时自动触发；也可通过 `cloud.sync` 主动发起。
- 同步失败时会触发 `cloud.onSyncError` 注册的回调。

## 支持的类型

当前版本支持除 `string` 之外的所有内建标量类型：
- `bool`
- `int`, `int8`, `int16`, `int32`, `int64`
- `uint`, `uint8`, `uint16`, `uint32`, `uint64`, `uintptr`
- `float32`, `float64`
- `byte`, `rune`
- `complex64`, `complex128`

暂不支持 `string` 或自定义结构体，以便准确控制存储配额。

## API 设计

所有云变量功能通过自动导入的 `cloud` 包提供，在 spx 代码中直接调用。

### bind

`bind` 将已有变量与云端记录关联。第一次绑定会尝试从云端载入该运行用户的值；如果云端尚无记录，则保留本地初始值并在下一次同步时写入云端。

```go
var (
    progress        int
    accuracy        float64
    autoSaveEnabled bool
)

onStart => {
    cloud.bind &progress, "progress"
    cloud.bind &accuracy, "accuracy"
    cloud.bind &autoSaveEnabled, "autoSave"
}
```

- 指针参数：待绑定的变量地址，类型需符合支持列表
- 名称参数：云变量名称，可与其他变量重名

### unbind

`unbind` 解除绑定，后续不会再自动同步。常用于退出、清理或条件性的临时绑定。

```go
cloud.unbind &progress
```

### sync

`sync` 主动触发一次同步（写入云端并拉取最新值），适合关键节点确保状态一致。

```go
cloud.sync "progress"
```

- `"progress"`：要同步的云变量名称；若存在多个同名绑定，都会参与同步

### onChange / offChange

`onChange` 监听或取消监听某个名称的云变量变化。回调执行时，本地变量已更新，并提供旧值与新值。

```go
cloud.onChange "progress", (oldValue, newValue) => {
    printf "进度从 %v 到 %v", oldValue, newValue
}

cloud.offChange "progress"
```

- 回调参数：`oldValue`, `newValue` 类型与绑定变量一致

### onSyncError

`onSyncError` 注册同步失败时的全局处理逻辑；未注册则使用默认提示。

```go
cloud.onSyncError (name, err) => {
    say "云变量同步失败: " + name
    printf "cloud sync error: %v", err
}
```

### onQuotaWarning

`onQuotaWarning` 在接近配额或触发频控时提醒。

```go
cloud.onQuotaWarning (name) => {
    say "云变量配额紧张: " + name
}
```

## 使用流程示例

```go
var (
    progress int
    accuracy float64
)

cloud.onChange "progress", (oldValue, newValue) => {
    printf "进度更新：%v -> %v", oldValue, newValue
}

cloud.onSyncError (name, err) => {
    say "同步失败：" + name
    printf "cloud sync error: %v", err
}

onStart => {
    cloud.bind &progress, "progress"
    cloud.bind &accuracy, "accuracy"
}

onMsg "level:complete", => {
    progress++
    cloud.sync "progress"
}

onMsg "accuracy:update", (delta float64) => {
    accuracy = accuracy + delta
    cloud.sync "accuracy"
}
```

运行结果：

1. `cloud.bind` 在 `onStart` 中执行，载入当前用户的 `progress` 与 `accuracy`。
2. 关卡完成时自增并调用 `cloud.sync`，立即写入云端。
3. `cloud.onChange` 感知到远端或其他设备更新时，自动反映到 UI。
4. 同步失败会触发 `cloud.onSyncError`，便于提示或记录日志。

## 常见问题

- **名称可以重名吗？** 可以。云端唯一键包含运行用户和项目，只要组合不同，数据就不会互相覆盖。
- **没有网络时怎么办？** 离线写入会暂存，网络恢复后按顺序同步。若与云端冲突，`onSyncError` 会收到提示。
- **为什么不支持 string？** 为了精确控制存储配额，目前仅支持能够直接量化长度的数值与布尔类型；后续可根据需求再扩充类型集。
