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
  if (lines.length > 1 && /^(?:func|type|var|const|class|interface)\b/.test(lines[0].trim())) lines.shift()
  return lines.join('\n').trim()
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
  ]
]

function mockTranslate(source: string): string {
  const normalizedSource = source.replace(/\s+/g, ' ').trim()
  const exact = exactMockTranslations.find(([pattern]) => pattern.test(normalizedSource))
  if (exact != null) return exact[1]

  const translated = source
    .replace(/\bdefault formats\b/gi, '默认格式')
    .replace(/\bstandard output\b/gi, '标准输出')
    .replace(/\bstring\b/gi, '字符串')
    .replace(/\btype\b/gi, '类型')
    .replace(/^Unable to /i, '无法')
    .replace(/^cannot /i, '无法')
  return translated === source ? `（模拟翻译）${source}` : translated
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
