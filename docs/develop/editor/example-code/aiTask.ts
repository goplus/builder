type CodeInput = {
    Position: Position
    Code: string
}

type Position = { Line: number, Column: number }

interface SuggestItem {
    label: string,
    desc: string,
    insertText: string,
}

export interface Suggest {
    startSuggestTask(input: CodeInput): SuggestItem[]
}
