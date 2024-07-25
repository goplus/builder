# Editor

## EditorUI

EditorUI 是一个前端中编辑器的模块。负责提供编辑器UI和多种辅助编辑和理解的功能集合，包括编辑器内部提示、悬浮框、代码完成菜单、文档等。

详见 [EditorUI](./01_ui/01_architecture.md) 。

## Coordinator

Coordinator 负责协调各个模块之间的交互。管理各个模块的交互以及数据流程，确保整个可扩展性与保证各模块内部只关心内部实现。

- 例子

```ts
function documentImplement(ui: EditorUI, doc: DocAbility, compiler: any) {
    ui.registerHoverProvider({
        async providerHover(model, ctx) {
            const word = model.getValueInRange(ctx.position)
            const id = compiler.getID()
            const content = await doc.getNormalDoc(id)
            const moreActions: Action[] = []
            const detailContent = await doc.getDetailDoc(id)
            if (detailContent != null) {
                moreActions.push({
                    icon: IconEnum.Document,
                    label: "xxx",
                    onClick: () => {
                        ui.invokeDocumentDetail("markdown")
                    }
                })
            }
            const c: LayerContent = {
                content: content.content,
                moreActions: [
                    ...moreActions
                ]
            }
            return c
        },
    })
}
```

## Compiler

Compiler模块具体利用编译器能力、代码检查等能力负责对代码、proj部分进行解析并生成AST树，并根据AST进行生成类型，实现基于wasm提供。

目前Complier 负责向UI模块提供其所需要的四种功能，分别是：

1. 获取行内提示
2. 获取错误提示
3. 获取补全列表
4. 获取Token类型

- 对外接口

```ts
interface Compiler {
    // List
    getInlayHints(fileUri: URI): InlayHint[]
    getDiagnostics(fileUri: URI): Diagnostic[]
    getCompletionItems(fileUri: URI, position: Position): CompletionItem[]
    // Single identifier
    getDefinition(fileUri: URI, position: Position): Identifier | null
}
```

## Runtime

Runtime模块负责在debug模式下负责捕获运行时错误并提供内容让UI组件获取。

- 对外接口

```ts
interface Runtime {
    OnRuntimeErrors(cb: (errors: CurrentRuntimeError) => void): Dispose;
}
```

## Doc

文档模块负责提供简略文档和详细文档，通过传入identifier来判断文档的内容，再进行展示。同时目前文档可以直接维护在前端代码中，因此不需要CRUD，内部实现仅为一个文档获取的函数。  

- 对外接口

```ts
interface DocAbility{
    getNormalDoc(identifier): Doc | null
    getDetailDoc(identifier): Doc | null
}
```

## Project

用到所有Project的地方都可以由项目中原有的Project类实现。因此目前只需要复用即可。

## Chatbot

用于负责与AI交流的部分，提供开启一个会话与继续发送消息的能力。提供了 解释、添加注释、修复代码 这三个对话功能。

```ts
export interface ChatBot {
    startExplainChat(input: ExplainChatInput): Chat
    startCommentChat(input: CommentChatInput): Chat
    startFixCodeChat(input: FixCodeChatInput): Chat
}
```

## Suggest

建议模块负责提供一个利用LLM来生成代码建议的功能，内部通过传入代码与光标位置对代码进行补全式生成。

```ts
export interface Suggest {
    startSuggestTask(input: CodeInput): SuggestItem[]
}
```
