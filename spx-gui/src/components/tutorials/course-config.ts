import { hideableWorkspaceAreas, isWorkspaceArea, type WorkspaceArea } from '@/components/editor/workspace-layout'

/**
 * The runtime log a project prints (via a preset `completeCourse()` helper) to declare the course
 * done, for `judge: "code"` courses. The frontend watches runtime output for it.
 */
export const courseCompleteSentinel = '@@builder:course-complete@@'

/** How a course decides it is complete. */
export type CourseCompletionJudge = 'code' | 'copilot'

/**
 * Static, author-declared configuration of a tutorial course. Written by the course author as a
 * ```jsonc code block in the course prompt (see `extractCourseConfig`), it is applied once when
 * the course starts. The copilot does not control this.
 */
export type CourseConfig = {
  /**
   * Workspace areas to hide (see `hideableWorkspaceAreas`). Omitted / absent means hide nothing.
   * Unknown names are ignored.
   */
  hiddenAreas: WorkspaceArea[]
  /**
   * Whether the copilot panel is open when the course starts. Courses default to a hidden,
   * background-running copilot; a course whose subject IS the copilot (e.g. the very first
   * lesson) declares `"copilot": "open"` to start with the panel showing.
   */
  copilotOpen: boolean
  /**
   * How course completion is decided. `code` (default): the project prints the completion sentinel
   * (see `courseCompleteSentinel`) from its own logic and the frontend judges — instant, no LLM
   * round. `copilot`: the copilot declares completion, for courses that run no game (e.g. "talk to
   * the copilot").
   */
  judge: CourseCompletionJudge
  /**
   * API names to narrow the API References panel to at course start (each matches all of its
   * overloads). Empty means no narrowing. Applied by the frontend, not the copilot.
   */
  apis: string[]
  /**
   * API names whose explainer video plays at course start (the course's new knowledge points).
   * Empty means none. The copilot can still play a video on request.
   */
  videos: string[]
}

/** The raw shape as authored in the jsonc block, before normalization. All fields optional. */
type RawCourseConfig = {
  hide?: unknown
  copilot?: unknown
  judge?: unknown
  apis?: unknown
  videos?: unknown
}

const emptyConfig: CourseConfig = { hiddenAreas: [], copilotOpen: false, judge: 'code', apis: [], videos: [] }

/**
 * Extract the first ```jsonc (or ```json) code block from the course prompt and parse it as the
 * course config. Returns an empty config when there is no block or it cannot be parsed — a
 * malformed block must not break course start.
 */
export function extractCourseConfig(coursePrompt: string): CourseConfig {
  const raw = extractJsoncBlock(coursePrompt)
  if (raw == null) return emptyConfig
  const parsed = parseJsonc(raw)
  if (parsed == null || typeof parsed !== 'object') return emptyConfig
  return normalizeCourseConfig(parsed as RawCourseConfig)
}

function extractJsoncBlock(prompt: string): string | null {
  const matched = prompt.match(/```jsonc?\s*\n([\s\S]*?)```/i)
  return matched?.[1] ?? null
}

/** Parse JSONC (JSON with // and block comments and trailing commas). Returns null on failure. */
export function parseJsonc(text: string): unknown {
  try {
    return JSON.parse(stripJsoncExtras(text))
  } catch {
    return null
  }
}

function stripJsoncExtras(text: string): string {
  let out = ''
  let inString = false
  let stringQuote = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]
    if (inString) {
      out += ch
      if (ch === '\\') {
        out += next ?? ''
        i++
      } else if (ch === stringQuote) {
        inString = false
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = true
      stringQuote = ch
      out += ch
      continue
    }
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++
      out += '\n'
      continue
    }
    if (ch === '/' && next === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i++ // skip the closing '/'
      continue
    }
    out += ch
  }
  // Remove trailing commas before } or ]
  return out.replace(/,(\s*[}\]])/g, '$1')
}

function normalizeCourseConfig(raw: RawCourseConfig): CourseConfig {
  return {
    hiddenAreas: normalizeHiddenAreas(raw.hide),
    copilotOpen: raw.copilot === 'open',
    judge: raw.judge === 'copilot' ? 'copilot' : 'code',
    apis: normalizeStringArray(raw.apis),
    videos: normalizeStringArray(raw.videos)
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const normalized = value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v !== '')
  return [...new Set(normalized)]
}

function normalizeHiddenAreas(value: unknown): WorkspaceArea[] {
  if (!Array.isArray(value)) return []
  const normalized = value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v): v is WorkspaceArea => isWorkspaceArea(v))
  return [...new Set(normalized)]
}

/** All workspace areas, for documenting the config's `hide` option. */
export const configurableHiddenAreas = hideableWorkspaceAreas
