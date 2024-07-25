// 鼠标光标位置
export type Position = {
    column: number,
    lineNumber: number
}

// 常用于表示选中代码位置
export type IRange = {
    startColumn: number,
    startLineNumber: number,
    endColumn: number,
    endLineNumber: number
}

export enum IconEnum {
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
    // 受支持的行内资源列表
    List
}

// 固定选择使用Icon
export type Icon = IconEnum

export type Markdown = string

type Identifier = {
    module: string, // "github.com/goplus/spx"
    name: string,   // "Sprite.touching"
}

type Token = Identifier


// 音频播放器
export type AudioPlayer = {
    src: string,
    duration: number
}

export interface RenamePreview {
    placeholder: string,
    onSubmit(
        newName: string,
        ctx: {
            token: AbortController
        },
        setError: (message: string) => void,
    ): Promise<void>
}

// 获取编辑器文本或者修改编辑器文本的模型
export interface TextModel {
    // 获取选取坐标之间的内容
    getValueInRange(range: IRange): string,
}

export interface EditorUI {
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
    registerCodeInputAssistantProvider(provider: CodeInputAssistantProvider): void
    // 用于激活AI对话模态框
    invokeAIChatModal(options: AIChatModalOptions): void
    // 用于激活详细文档侧边栏
    invokeDocumentDetail(docDetail: DocDetail): void
}

export interface CompletionItem {
    icon: Icon,
    // 标签
    label: string,
    // 描述
    desc: string,
    // 插入的内容
    insertText: string,
    // 补全菜单项激活时，额外显示的当前菜单项的预览，例如：API文档，音频预览
    preview: LayerContent
}

export interface CompletionProvider {
    provideDynamicCompletionItems(
        model: TextModel,
        ctx: {
            position: Position,
            // 如果要补全"hello world"，输入到"hello wo"，unitWord表示："wo"
            unitWord: string,
            token: AbortController
        },
        addItems: (items: CompletionItem[])=> void
    ): void
}

// tag表示有灰色背景的文字，text表示灰色文字，icon表示灰色图标
export type InlayHintStyle = "tag" | "text" | "icon"

// none表示不对鼠标交互产生反应，triggerCompletion用于弹出补全菜单
// 例如：play "soundName", 这里输入 "soundName" 补全菜单会基于当前项目中的声音名称展示内容，
// 这里通过鼠标点击图标的方式，方便用户选择，而无需键盘输入。
export type InlayHintBehavior = "none" | "triggerCompletion"

export type InlayHint = {
    content: string | Icon,
    style: InlayHintStyle,
    behavior: InlayHintBehavior,
    position: Position
}

export interface InlayHintsProvider {
    provideInlayHints(
        model: TextModel,
        ctx: {
            token: AbortController
        }
    ): Promise<InlayHint[]>
}

export type SelectionMenuItem = {
    icon: Icon,
    label: string,
    action: () => void
}

export interface SelectionMenuProvider {
    provideSelectionMenuItems(
        model: TextModel,
        ctx: {
            selection: IRange,
            // 鼠标选中的内容
            selectContent: string
        }
    ): Promise<SelectionMenuItem[]>
}

export type LayerContent = DocPreview | AudioPlayer | RenamePreview

export interface HoverProvider {
    provideHover(
        model: TextModel,
        ctx: {
            position: Position,
            // 鼠标悬停的关键词
            hoverUnitWord: string,
            token: AbortController
        }
    ): Promise<LayerContent>
}

type CodeSnapUsage = {
    /** Description for usage, without tailing dot */
    desc: LayerContent
    /** Code sample, usually it's similar while sightly different with `insertText` */
    sample: string
    /**
     * A string or snippet that should be inserted in a document for the usage.
     * Same with `languages.CompletionItem.insertText`.
     */
    insertText: string
}

type CodeSnap = {
    icon: Icon,
    // used for 2 or more usages to explain codeSnap main function
    desc: string,
    usages: CodeSnapUsage[],
    token: Token
}

type CodeSnapGroup = {
    label: string
    codeSnaps: CodeSnap[]
}

type CodeSnapCategory = {
    label: string
    groups: CodeSnapGroup[]
    icon: Icon,
    color: string
}

interface CodeInputAssistantProvider {
    provideCodeInputAssistant(ctx: {
        token: AbortController
    }): Promise<CodeSnapCategory[]>
}

export enum AttentionHintLevelEnum {
    WARNING,
    ERROR
}

export type AttentionHint = {
    level: AttentionHintLevelEnum,
    range: IRange,
    message: string,
    hoverContent: LayerContent
}

export interface AttentionHintsProvider {
    provideAttentionHints(
        addHints: (hints: AttentionHint[])=> void,
        ctx: {
            token: AbortController
        }
    ): void
}

export type RecommendAction = {
    label: string,
    activeLabel: string,
    onActiveLabelClick(): void | LayerContent
}

export type Action = {
    icon: Icon,
    label: string,
    onClick(): void | LayerContent
}

export type DocDetail = Markdown

export type DocPreview = {
    content: Markdown,
    recommendAction?: RecommendAction | undefined,
    moreActions?: Action[] | undefined
}

export type ReplyAction = {
    message: string
}

export type Reply = {
    message: Markdown,
    actions: ReplyAction[]
}

export type AIChatModalOptions = {
    initialMessage: string,
    reply?: (userMessage: Markdown)=> Promise<Reply>
}
