# Editor

## 01_EditorUI

详见 [EditorUI](./01_ui/01_architecture.md) 。

## 02_Coordinator

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

## 03_Compiler

Complier 负责向UI模块提供其所需要的四种功能，分别是：

1. 获取行内提示
2. 获取错误提示
3. 获取补全列表
4. 获取Identity类型

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

## 04_Runtime

Runtime模块负责在debug模式下负责捕获运行时错误并提供内容让UI组件获取。

- 对外接口

```ts
interface Runtime {
    OnRuntimeErrors(cb: (errors: CurrentRuntimeError) => void): Dispose;
}
```

## 05_Doc

文档模块负责提供简略文档和详细文档，通过传入identifier来判断文档的内容，再进行展示。同时目前文档可以直接维护在前端代码中，因此不需要CRUD，内部实现仅为一个文档获取的函数。  

- 对外接口

```ts
interface DocAbility{
    getNormalDoc(identifier): Doc | null
    getDetailDoc(identifier): Doc | null
}
```

## 05_Project

用到所有Project的地方都可以由项目中原有的Project类实现。因此目前只需要复用即可。

## 06_Chatbot

用于负责与AI交流的部分，提供开启一个会话与继续发送消息的能力。

```ts
export interface ChatBot {
    startExplainChat(input: ExplainChatInput): Chat
    startCommentChat(input: CommentChatInput): Chat
    startFixCodeChat(input: FixCodeChatInput): Chat
}
```

## 06_Suggest

```ts
export interface Suggest {
    startSuggestTask(input: CodeInput): SuggestItem[]
}
```
