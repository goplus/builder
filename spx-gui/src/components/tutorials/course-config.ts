import { hideableWorkspaceAreas, isWorkspaceArea, type WorkspaceArea } from '@/components/editor/workspace-layout'

/**
 * The runtime log a project prints (via a preset `completeCourse()` helper) to declare the course
 * done, for `judge: "code"` courses. The frontend watches runtime output for it.
 */
export const courseCompleteSentinel = '@@builder:course-complete@@'

/** How a course decides it is complete. */
export type CourseCompletionJudge = 'code' | 'copilot'

/**
 * A target a course opening can spotlight. `api` addresses an item in the API references panel by
 * its API name / definition ID (see `createCourseApiMatcher`); `ui` addresses a UI landmark by its
 * Radar node name (see `Radar.getNodeByName`, e.g. `"Run button"`); `sprite` addresses a sprite on
 * the edit-mode stage by its name (e.g. `"Boat"` — the stage viewer anchors an overlay on it).
 */
export type CourseSpotlightTarget =
  | { kind: 'api'; name: string }
  | { kind: 'ui'; name: string }
  | { kind: 'sprite'; name: string }

/**
 * One step of a course's opening sequence, applied by the frontend once the editor is up (see
 * `TutorialRoot`). Steps play strictly in the authored order:
 * - `prelude`: a one-off text guide shown in a modal;
 * - `video`: the knowledge-point explainer video for an API (skipped if already learned);
 * - `spotlight`: highlight a UI element until the user clicks, with an optional tip.
 */
export type CourseOpeningStep =
  | { kind: 'prelude'; text: string }
  | { kind: 'video'; api: string }
  | { kind: 'spotlight'; target: CourseSpotlightTarget; tip: string; patient: boolean }

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
  /**
   * For `judge: "code"` courses, what in the runtime output marks completion. `log` is a substring
   * to look for in output lines; `count` is how many DISTINCT matching lines (within one run)
   * complete the course — e.g. `{ "log": "捡到萝卜", "count": 4 }` for a collect-all-4 goal.
   * Absent means the default: one line carrying the completion sentinel (see
   * `courseCompleteSentinel`, printed by the project itself).
   */
  complete: {
    log: string
    count: number
    /**
     * The secondary goal, checked only once the primary one (the runtime signal above) is met.
     * `code` names tokens that must appear in the learner's code — `repeat`, `turn`, … — which is
     * what lets a course insist on *how* the goal was reached without an LLM round. When the
     * primary goal lands and this does not, the course is not complete: `hint` is shown instead,
     * crediting what worked and naming what is still missing.
     */
    require: { code: string[]; hint: string } | null
  } | null
  /**
   * The course's opening sequence — prelude / knowledge-point video / spotlight steps, played in
   * the authored order once the editor is up. When non-empty it is the single source of ordering
   * for the in-editor opening and supersedes `videos` (and the legacy pre-editor `<course-prelude>`
   * modal). Empty means the legacy behavior: `videos` play at start and `<course-prelude>` shows
   * before the editor.
   */
  opening: CourseOpeningStep[]
}

/** The raw shape as authored in the jsonc block, before normalization. All fields optional. */
type RawCourseConfig = {
  hide?: unknown
  copilot?: unknown
  judge?: unknown
  apis?: unknown
  videos?: unknown
  complete?: unknown
  opening?: unknown
}

const emptyConfig: CourseConfig = {
  hiddenAreas: [],
  copilotOpen: false,
  judge: 'code',
  apis: [],
  videos: [],
  complete: null,
  opening: []
}

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
    videos: normalizeStringArray(raw.videos),
    complete: normalizeComplete(raw.complete),
    opening: normalizeOpening(raw.opening)
  }
}

function normalizeOpening(value: unknown): CourseOpeningStep[] {
  if (!Array.isArray(value)) return []
  const steps: CourseOpeningStep[] = []
  for (const entry of value) {
    const step = normalizeOpeningStep(entry)
    if (step != null) steps.push(step)
  }
  return steps
}

/** Parse one opening entry. An entry carries exactly one of `prelude` / `video` / `spotlight`. */
function normalizeOpeningStep(entry: unknown): CourseOpeningStep | null {
  if (entry == null || typeof entry !== 'object') return null
  const { prelude, video, spotlight, tip, patient } = entry as {
    prelude?: unknown
    video?: unknown
    spotlight?: unknown
    tip?: unknown
    patient?: unknown
  }
  if (typeof prelude === 'string' && prelude.trim() !== '') {
    return { kind: 'prelude', text: prelude.trim() }
  }
  if (typeof video === 'string' && video.trim() !== '') {
    return { kind: 'video', api: video.trim() }
  }
  const target = normalizeSpotlightTarget(spotlight)
  if (target != null) {
    // `patient` opts out of the retry-then-skip default for targets that only appear after the
    // user acts on the previous step (e.g. a sprite's name label, which exists once the sprite is
    // selected). The author asserts the target WILL appear, so the step waits instead of skipping.
    return { kind: 'spotlight', target, tip: typeof tip === 'string' ? tip.trim() : '', patient: patient === true }
  }
  return null
}

function normalizeSpotlightTarget(value: unknown): CourseSpotlightTarget | null {
  if (value == null || typeof value !== 'object') return null
  const { api, ui, sprite } = value as { api?: unknown; ui?: unknown; sprite?: unknown }
  if (typeof api === 'string' && api.trim() !== '') return { kind: 'api', name: api.trim() }
  if (typeof ui === 'string' && ui.trim() !== '') return { kind: 'ui', name: ui.trim() }
  if (typeof sprite === 'string' && sprite.trim() !== '') return { kind: 'sprite', name: sprite.trim() }
  return null
}

function normalizeComplete(value: unknown): CourseConfig['complete'] {
  if (value == null || typeof value !== 'object') return null
  const { log, count, require } = value as { log?: unknown; count?: unknown; require?: unknown }
  if (typeof log !== 'string' || log.trim() === '') return null
  const normalizedCount = typeof count === 'number' && Number.isInteger(count) && count > 0 ? count : 1
  return { log: log.trim(), count: normalizedCount, require: normalizeRequire(require) }
}

function normalizeRequire(value: unknown): NonNullable<CourseConfig['complete']>['require'] {
  if (value == null || typeof value !== 'object') return null
  const { code, hint } = value as { code?: unknown; hint?: unknown }
  const tokens = normalizeStringArray(code)
  // A requirement with nothing to look for would gate the course on a condition that can never
  // fail; drop it rather than pretend it is enforcing something.
  if (tokens.length === 0) return null
  return { code: tokens, hint: typeof hint === 'string' ? hint.trim() : '' }
}

/**
 * Whether the learner's code uses every required token.
 *
 * Comments and string literals are removed first: a course that asks for `repeat` must not be
 * satisfied by the word sitting in the starter code's own explanatory comment, which is exactly
 * where it tends to appear.
 */
export function meetsCodeRequirement(code: string, tokens: string[]): boolean {
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
  return tokens.every((token) => new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(stripped))
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

/**
 * Whether a definition ID (e.g. `xgo:github.com/goplus/spx/v2?Sprite.step#0`) matches an
 * author-declared API entry. An entry with `?` is a definition ID — without an overload suffix it
 * matches all overloads. A plain entry matches the dotted name (`Sprite.step`) or its last
 * segment (`step`).
 */
function matchesApiEntry(entry: string, definitionId: string): boolean {
  if (entry.includes('?')) {
    // A full definition ID. Note that it pins the engine module version (`.../spx/v2?...`) and
    // rots when the engine major-bumps — course data should prefer the version-free forms below,
    // which can still pin an overload with `#N`.
    return definitionId === entry || definitionId.startsWith(`${entry}#`)
  }
  const [entryName, entryOverload] = splitEntryOverload(entry)
  const decoded = decodeURIComponent(definitionId.split('?').at(-1) ?? '')
  const [dotted, idOverload] = splitEntryOverload(decoded)
  if (entryOverload != null && entryOverload !== idOverload) return false
  if (dotted === entryName) return true
  return dotted.split('.').at(-1) === entryName
}

function splitEntryOverload(value: string): [name: string, overload: string | null] {
  const hashIdx = value.indexOf('#')
  if (hashIdx < 0) return [value, null]
  return [value.slice(0, hashIdx), value.slice(hashIdx + 1)]
}

/** Build a matcher deciding whether a definition ID belongs to the author-declared API set. */
export function createCourseApiMatcher(entries: string[]): (definitionId: string) => boolean {
  return (definitionId) => entries.some((entry) => matchesApiEntry(entry, definitionId))
}
