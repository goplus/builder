import type { LocaleMessage } from '@/utils/i18n'
import type { Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath, TutorialProject } from '@/models/tutorial/project'

/**
 * What keeps the files of a Playground Course from being imported: what is missing or cannot be loaded, and videos
 * its program plays that it does not have. Empty when the course is fine.
 */
export async function checkPlaygroundCourse(files: Files): Promise<LocaleMessage[]> {
  const problems: LocaleMessage[] = []
  if (files[configFilePath] == null) {
    problems.push({
      en: `The course settings (${configFilePath}) are missing`,
      zh: `缺少课程设置（${configFilePath}）`
    })
  }
  if (files[mainCourseFilePath] == null) {
    problems.push({
      en: `The course program (${mainCourseFilePath}) is missing`,
      zh: `缺少课程程序（${mainCourseFilePath}）`
    })
  }
  if (problems.length > 0) return problems

  const project = new TutorialProject()
  try {
    try {
      await project.loadFiles(files)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return [{ en: `The course cannot be loaded: ${message}`, zh: `课程无法加载：${message}` }]
    }
    const videos = new Set(project.videos.map((video) => video.name))
    for (const name of new Set(findPlayedVideoNames(project.mainCourse.code))) {
      if (!videos.has(name)) {
        problems.push({
          en: `The course program plays video "${name}", which the course does not have`,
          zh: `课程程序播放的视频“${name}”不存在`
        })
      }
    }
    return problems
  } finally {
    project.dispose()
  }
}

/**
 * The names of the videos `code` plays with a string literal, as in `showVideo "intro"` or `showVideo("intro")`.
 * Comments and other string literals are skipped, so that neither a commented-out call nor a message that mentions
 * one counts; a name that is not a literal cannot be known here and is left out.
 */
export function findPlayedVideoNames(code: string): string[] {
  const names: string[] = []
  let i = 0
  while (i < code.length) {
    if (code.startsWith('//', i)) {
      const end = code.indexOf('\n', i)
      i = end < 0 ? code.length : end
    } else if (code.startsWith('/*', i)) {
      const end = code.indexOf('*/', i + 2)
      i = end < 0 ? code.length : end + 2
    } else if (isQuote(code[i])) {
      i = readStringLiteral(code, i).end
    } else if (isIdentifierChar(code[i]) && (i === 0 || !isIdentifierChar(code[i - 1]))) {
      let end = i
      while (end < code.length && isIdentifierChar(code[end])) end++
      if (code.slice(i, end) === 'showVideo') {
        let j = skipSpaces(code, end)
        if (code[j] === '(') j = skipSpaces(code, j + 1)
        if (code[j] === '"' || code[j] === '`') {
          const literal = readStringLiteral(code, j)
          if (literal.value != null) names.push(literal.value)
          end = literal.end
        }
      }
      i = end
    } else {
      i++
    }
  }
  return names
}

function isQuote(char: string) {
  return char === '"' || char === '`' || char === "'"
}

function isIdentifierChar(char: string) {
  return /[\p{L}\p{N}_]/u.test(char)
}

function skipSpaces(code: string, i: number) {
  while (code[i] === ' ' || code[i] === '\t') i++
  return i
}

/** The literal starting at `start`: where it ends, and its value when it is a string that could be decoded. */
function readStringLiteral(code: string, start: number): { end: number; value: string | null } {
  const quote = code[start]
  let i = start + 1
  while (i < code.length && code[i] !== quote) {
    // Raw strings (backquoted) have no escapes; the others do, and do not span lines.
    if (quote !== '`' && code[i] === '\\') i++
    else if (quote !== '`' && code[i] === '\n') return { end: i, value: null }
    i++
  }
  const end = Math.min(i + 1, code.length)
  const body = code.slice(start + 1, i)
  if (quote === '`') return { end, value: body }
  if (quote === "'") return { end, value: null }
  try {
    return { end, value: JSON.parse(`"${body}"`) as string }
  } catch {
    // An escape JSON does not know (`\x41`, say): the name cannot be told for sure, so it is not checked.
    return { end, value: null }
  }
}
