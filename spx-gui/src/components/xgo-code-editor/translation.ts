import type { Lang } from '@/utils/i18n'

export type EditorTranslationKind = 'diagnostic' | 'documentation'

export type EditorTranslationRequest = {
  kind: EditorTranslationKind
  source: string
  locale: Lang
  contentIndex?: number
  diagnosticSeverity?: 'error' | 'warning'
}

/** Adapter used by the editor UI. Replace the mock implementation with an API-backed adapter later. */
export interface EditorTranslationProvider {
  translate(request: EditorTranslationRequest, signal?: AbortSignal): Promise<string>
}

/** Return only the explanatory part of a definition hover. */
export function extractDocumentationExplanation(markdown: string): string {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, '').trim()
  const lines = withoutCode.split(/\r?\n/)
  return lines
    .filter((line) => !/^(?:func|type|var|const|class|interface)\b/.test(line.trim()))
    .join('\n')
    .trim()
}

const exactMockTranslations: Array<[RegExp, string]> = [
  [
    /cannot use v\.IsMature \(type func\(\) bool\) as type bool in autoclosure/i,
    '无法将 v.IsMature（类型为 func() bool）作为 autoclosure 中的 bool 类型使用'
  ],
  [
    /Println formats using the default formats for its operands and writes to standard output\. Spaces are always added between operands and a newline is appended\. It returns the number of bytes written and any write error encountered\./i,
    'Println 使用默认格式输出参数并写入标准输出。参数之间会自动添加空格，并在末尾追加换行符。它返回写入的字节数以及可能遇到的写入错误。'
  ],
  [
    /string is the set of all strings of 8-bit bytes, conventionally but not necessarily representing UTF-8-encoded text\. A string may be empty, but not nil\. Values of string type are immutable\./i,
    'string 是所有 8 位字节字符串的集合，通常表示 UTF-8 编码文本，但并非必须如此。字符串可以为空，但不能为 nil。string 类型的值不可变。'
  ],
  [
    /Think sends a message to the AI and processes its response\. The optional context provides extra context for this specific interaction\.\s*Think implements an iterative loop, continuing the interaction with the AI based on command execution results until the AI signals its completion \(no command\) or a \[Break\] is encountered, or a critical error occurs\./i,
    'Think 会向 AI 发送消息并处理 AI 的响应。可选的 context 参数会为这次交互提供额外上下文。Think 会根据命令执行结果持续与 AI 交互，直到 AI 表示完成（没有命令）、遇到 [Break]，或发生严重错误。'
  ]
]

function mockTranslate(source: string): string {
  const normalizedSource = source.replace(/\s+/g, ' ').trim()
  const exact = exactMockTranslations.find(([pattern]) => pattern.test(normalizedSource))
  if (exact != null) return exact[1]

  return `【模拟翻译】${source}`
}

export const mockEditorTranslationProvider: EditorTranslationProvider = {
  async translate(request, signal) {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, 650)
      signal?.addEventListener(
        'abort',
        () => {
          window.clearTimeout(timer)
          reject(signal.reason)
        },
        { once: true }
      )
    })
    if (request.locale === 'en') return request.source
    return mockTranslate(request.source)
  }
}
