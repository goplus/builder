### registerCodeInputAssistantProvider

效果图：

![HoverProvideDocPreview](../assets/HoverProvideDocPreview.png)

```ts

enum IdentifierContext {
    /** Available only in sprite code files */
    sprite,
    /** Available only in stage code files */
    stage,
    /** Available in all code files */
    all
}

type IdentifierUsage = {
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

type Identifier = {
    icon: Icon,
    target: IdentifierContext,
    module: string, // "github.com/goplus/spx"
    name: string,   // "Sprite.touching"
    keyword: string,
    desc: string,
    usages: IdentifierUsage[]
}

type IdentifierGroup = {
    label: string
    identifiers: Identifier[]
}

type IdentifierCategory = {
    label: string
    groups: IdentifierGroup[]
    icon: Icon,
    color: string
}

interface CodeInputAssistantProvider {
    provideCodeInputAssistant(ctx: {
        hoverUnitWord: string,
        target: IdentifierContext,
        usageSample: string
    }): Promise<IdentifierCategory[]>
}
```
