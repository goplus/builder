import { describe, expect, it } from 'vitest'
import { getHighlighter, theme } from './highlighter'

describe('XGo highlighter', () => {
  it.each(['xgo', 'gop', 'spx'])('renders API snippets with the %s alias', async (lang) => {
    const highlighter = await getHighlighter()
    const { tokens } = highlighter.codeToTokens('step 120', { lang, theme })
    const line = tokens[0]
    expect(line.map((token) => token.content).join('')).toBe('step 120')
    expect(new Set(line.map((token) => token.color)).size).toBeGreaterThan(1)
    expect(highlighter.codeToHtml('turn Right', { lang, theme, structure: 'inline' })).toContain('<span')
  })

  it('preserves multiline code and colors strings separately from commands', async () => {
    const highlighter = await getHighlighter()
    const code = 'onStart => {\n\tsay "你好，Safari"\n}'
    const { tokens } = highlighter.codeToTokens(code, { lang: 'xgo', theme })
    expect(tokens.map((line) => line.map((token) => token.content).join('')).join('\n')).toBe(code)
    const command = tokens[1].find((token) => token.content.includes('say'))
    const string = tokens[1].find((token) => token.content.includes('你好'))
    expect(command).toBeDefined()
    expect(string).toBeDefined()
    expect(string?.color).not.toBe(command?.color)
  })
})
