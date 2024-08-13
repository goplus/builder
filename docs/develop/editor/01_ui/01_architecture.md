# CommonInterface

```ts
// 代码编辑器中鼠标光标的位置
type Position = {
    column: number,
    lineNumber: number
}

// 代码编辑器中选中的代码的起始位置和结束位置
type IRange = {
    startColumn: number,
    startLineNumber: number,
    endColumn: number,
    endLineNumber: number
}

enum IconEnum {
    // 函数
    Function,
    // 事件
    Event,
    // 属性
    Prototype,
    // 关键词
    Keywords,
    // AI能力
    AIAbility,
    // 文档
    Document,
    // 重命名
    Rename,
    // 受支持的资源列表
    List
}

// 固定选择使用Icon
type Icon = IconEnum

type Markdown = string

// 重命名卡片
type RenamePreview = {
    placeholder: string,
    onSubmit: (
        newName: string,
        ctx: {
            token: AbortController
        },
        setError: (message: string) => void,
    ) => Promise<void>
}

// 音频播放器
type AudioPlayer = {
    // 音频地址
    src: string,
    // 音量
    volumne: number,
    // 音频时长
    duration: number
}

// 获取编辑器文本或者修改编辑器文本的文本操作模型
interface TextModel {
    // 通过给定的坐标获取坐标之间的内容
    getValueInRange(range: IRange): string,
}

interface EditorUI {
    // 用于补全菜单
    registerCompletionProvider(provider: CompletionProvider): void
    // 用于行内形参展示
    registerInlayHintsProvider(provider: InlayHintsProvider): void
    // 用于代码选中弹出菜单
    registerSelectionMenuProvider(provider: SelectionMenuProvider): void
    // 用于鼠标悬停弹出内容
    registerHoverProvider(provider: HoverProvider): void
    // 用于Lint或Runtime展示指定行提醒
    registerAttentionHintsProvider(provider: AttentionHintsProvider): void
    // 用于快捷输入代码
    registerInputAssistantProvider(provider: InputAssistantProvider): void
    // 用于激活AI对话模态框
    invokeAIChatModal(options: AIChatModalOptions): void
    // 用于激活详细文档侧边栏
    invokeDocumentDetail(docDetail: DocDetail): void
}
```



