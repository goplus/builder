# Doc & Project

内部设计较为简单，分别是获取文档内容和获取项目相关详细信息。

## Doc

文档是指以Markdown格式提供的，对spx与gop关键字等代码Token的解释文档，通过维护文档可以向用户展示功能与代码的解释。文档内容分层为简略文档和详细文档，以满足不同界面形式对不同信息量的对应。

- 提供接口

```ts
interface DocAbility{
    getNormalDoc(token: Token): Doc | null
    getDetailDoc(token: Token): Doc | null
}

type Doc = {
    content: MarkDown
    type: enum // normal, detail
    token: Token
}
```

- 面向未来拓展

根据未来路线图，在可能加入后端支持，因此未来可能设计文档模块的CRUD以支持社区开发者维护其自身文档。并且需要保证文档内部图片防盗等情况。

## Project

- 提供接口(已有)

```ts
interface Project {
    // 获取项目中的精灵代码、背景代码
    getProjectCode(): Code[] //现有：exportGameFiles

    // project file hash
    getFileHash(): string // 现有 filesHash

    // project context 
    getContext(): ProjectContext // 现有 Project.name,  Sprite.name[]

    // rename
    Sprite.setName(name: string): void
    ...setName()
}
```

```ts
type Code = {
    type: enum, // sprite, stage
    content: string // code
}

type ProjectContext = {
    name: string
    codes: Code[]
    projectVariables: ProjectVariable[]
}

type ProjectVariable = {
    name: string
    type: enum
}
```
