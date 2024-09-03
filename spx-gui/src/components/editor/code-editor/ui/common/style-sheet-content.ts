export class StyleSheetContent {
  private styleElement = document.createElement('style')
  private styleMap = new Map<string, string>()

  constructor() {
    document.head.appendChild(this.styleElement)
  }

  public addPseudoElementClassNameWithHashContent(content: string) {
    const className = `_${this.hash(content)}`
    if (!this.styleMap.has(className)) {
      const css = `.${className}::after { content: "${content}"; }`
      this.styleElement.appendChild(document.createTextNode(css))
      this.styleMap.set(className, css)
    }

    return className
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
