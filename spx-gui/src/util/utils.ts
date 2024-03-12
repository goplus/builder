import { keywords, typeKeywords } from "@/components/code-editor/language"

export const isAllowName = (name: string) => {
    // spx code is go+ code, and the sprite name will compiled to an identifier of go+
    // so sprite name rules is depend on the identifier rules of go+.
    const regex = /^[\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_]*$/
    return regex.test(name) && !typeKeywords.includes(name) && !keywords.includes(name)
}
