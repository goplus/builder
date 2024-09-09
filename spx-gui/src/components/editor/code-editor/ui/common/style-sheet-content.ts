/**
 * used for dynamic stylesheet management in inlayHint, attentionHint, etc.
 * by hash content to generate cssText: .[hashContent]::after { content: 'xxx' }
 * insert this into stylesheet
 */
export class StyleSheetContent {
  private styleElement = document.createElement('style')
  private styleMap = new Map<string, string>()

  constructor() {
    document.head.appendChild(this.styleElement)
  }

  public addPseudoElementClassNameWithHashContent(_content: string) {
    const content = _content.split('\n').shift()
    if (!content) return
    // add prefix '_' to avoid illegal class name declare
    const className = `_${this.hash(content)}`
    if (!this.styleMap.has(className)) {
      const escapedContent = this.toUnicodeEscape(content)
      const css = `.${className}::after { content: "${escapedContent}"; }`
      this.styleElement.appendChild(document.createTextNode(css))
      this.styleMap.set(className, css)
    }

    return className
  }

  private toUnicodeEscape(str: string) {
    return str
      .split('')
      .map((char) => {
        const code = char.charCodeAt(0).toString(16).padStart(4, '0')
        return `\\${code}`
      })
      .join('')
  }

  private hash(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0 // Convert to 32bit integer
    }
    return hash.toString(36)
  }

  dispose() {
    this.styleElement.remove()
    this.styleMap.clear()
  }
}
