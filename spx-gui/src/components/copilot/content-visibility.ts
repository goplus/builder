import { tagName as staySilentTagName } from './markdown-elements/StaySilent'
import { tagName as thinkingTagName } from './markdown-elements/Thinking'

const closedThinkingPattern = new RegExp(`<${thinkingTagName}\\b[^>]*>[\\s\\S]*?</${thinkingTagName}>`, 'g')
const unclosedThinkingPattern = new RegExp(`<${thinkingTagName}\\b[\\s\\S]*$`)
const staySilentPattern = new RegExp(`<${staySilentTagName}\\b`)
// A partially streamed opening tag at the end of the content, e.g. `<thinki` or `<stay-sil`.
const trailingPartialTagPattern = /<[a-zA-Z][\w-]*$/

/**
 * Remove `thinking` blocks — including a still-unclosed one — from copilot content. Unlike the
 * render-null element (which only hides a well-formed block after parsing), this hides the
 * reasoning TEXT itself, so it never counts as (or flashes as) visible content.
 */
export function stripThinking(content: string): string {
  return content.replace(closedThinkingPattern, '').replace(unclosedThinkingPattern, '')
}

/**
 * Sanitize partially-streamed copilot content for display: thinking is hidden even before its
 * closing tag arrives, a reply already containing `stay-silent` is known to be entirely hidden
 * (show nothing rather than flash it), and a trailing half-streamed tag is held back.
 */
export function sanitizeInProgressContent(content: string): string {
  if (staySilentPattern.test(content)) return ''
  return stripThinking(content).replace(trailingPartialTagPattern, '')
}
