type MarkDown = string

type Doc = {
    content: MarkDown
    identify: string
}

export interface DocAbility {
    getNormalDoc(identifier: string): Promise<Doc>
    getDetailDoc(identifier: string): Promise<Doc> | null
}

type NormalDocMap = {
    [key in string]: Doc
}

type DetailDocMap = {
    [key in string]: Doc
}