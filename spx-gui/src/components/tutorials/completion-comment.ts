import { stripThinking } from '@/components/copilot/content-visibility'

/**
 * Reduce a copilot reply to the evaluation shown in the course success dialog.
 *
 * The reply is Markdown prose, rendered as such by the dialog, so line breaks are structure and
 * survive — only runs of spaces collapse. What does not survive is markup: the copilot's own
 * elements (a progress verdict, a stay-silent, ...) are tools, not prose, and a dialog is not where
 * they belong. Stripping every tag rather than an allow-list also keeps raw HTML out of a surface
 * that is meant to carry a sentence.
 */
export function sanitizeCompletionComment(reply: string): string {
  return stripThinking(reply)
    .replace(/<\/?[a-zA-Z][\w-]*(?:\s[^>]*?)?\/?>/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
