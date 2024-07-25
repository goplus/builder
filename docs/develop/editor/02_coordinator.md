# Coordinator

Coordinator 负责协调各个模块之间的交互。管理各个模块的交互以及数据流程，确保整个可扩展性与保证各模块内部只关心内部实现。

- 自身提供

```ts
//coordinator
interface Editor {
    jump(position: Position): void
}
```

示例代码：

```ts
//ui document example
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

//syntax error&runtime error example
function attentionHintImplement(ui: EditorUI, runtime: RuntimeAbility, compiler: any, project: any) {
    ui.registerAttentionHintProvider({
        provideAttentionHint(addHints: (hints: AttentionHint[]) => void, ctx: { token: AbortController }) {
            const syntaxErrors = compiler.getSyntaxError();
            addHints(syntaxErrors.map((error) => ({
                level: AttentionHintLevelEnum.ERROR,
                range: error.Range,
                message: error.Message,
                hoverContent: {
                    content: "",
                }
            })))
            const close = runtime.OnRuntimeErrors(({ runtimeErrorList, runtimeErrorProjectHash }) => {
                if (runtimeErrorProjectHash == project.getHash()) {
                    addHints(runtimeErrorList.map((error) => ({
                        level: AttentionHintLevelEnum.ERROR,
                        range: error.Range,
                        message: error.Message,
                        hoverContent: {
                            content: "",
                        }
                    })))
                }
            })
            ctx.token.signal.addEventListener("abort", () => {
                close()
            })
        }
    })
}

//show ai modal example
function showAIModal(ui: EditorUI, chatBot: ChatBot) {
    ui.registerSelectionMenuProvider({
        async provideSelectionMenuItems(model: TextModel, ctx: { selection: IRange, selectContent: string }) {
            return [
                {
                    label: "解释一下代码",
                    icon: IconEnum.AIAbility,
                    action: () => {
                        ui.invokeAIChatModal({
                            initialMessage: "帮我解释一下代码",
                            reply: async (usermsg) => {
                                let chat = await chatBot.startExplainChat({ input: usermsg, lang: "zh-cn" })
                                const resp = await chat.sendUserMessage("")
                                return {
                                    message: resp.content,
                                    actions:
                                        resp.actions.map((action) => {
                                            return {
                                                message: action.message,
                                            }
                                        })
                                }
                            }
                        })
                    }
                },
                {
                    label: "给代码加点注释",
                    icon: IconEnum.AIAbility,
                    action: () => { }
                },
                {
                    label: "怎么修复代码呢",
                    icon: IconEnum.AIAbility,
                    action: () => { }
                },
            ]
        }
    })
}
```
