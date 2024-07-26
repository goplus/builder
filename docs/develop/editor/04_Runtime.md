# Runtime

Runtime模块在debug模式下负责捕获运行时错误并提供内容让UI组件获取。

## 对外接口

提供一个获取捕获到的运行时输出的函数用于让UI部分获取具体内容，并且这个函数内提供的是解析完的参数。也提供回调让出现新的console行时就触发。

```typescript
interface Runtime {
    onRuntimeErrors(cb: (errors: RuntimeErrors) => void): Dispose;
}

// 停止捕获 并关闭监听
type Dispose = () => void;

type RuntimeErrors = {
    errors: RuntimeError[];
    fileHash: string;
}

type RuntimeError = {
    message: string;
    position: Position;
}

type Position = {
    line: number;
    column: number;
    fileUri: string;
}

```

## 详细设计

内部需要实现的：

1. 捕获运行时错误
2. 解析运行时错误
3. 同步项目文件哈希
4. 维护单次运行时错误列表

```typescript
type Log = string;

interface Runtime {
    runtimeErrorList: RuntimeError[];
    projectFilesHash: string;
    handleRuntimeLog(log: Log): void;
    parseRuntimeLog(logList: Log[]): void;
}
```
