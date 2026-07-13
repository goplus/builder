import { hideableWorkspaceAreas, isWorkspaceArea, type WorkspaceArea } from '@/components/editor/workspace-layout'
import type { APIReferenceItem } from '@/components/xgo-code-editor'

/**
 * Static, author-declared configuration of a tutorial course's workspace. Written by the course
 * author as a ```jsonc code block in the course prompt (see `extractCourseConfig`), it is applied
 * once when the course starts. The copilot does not control any of this.
 */
export type CourseConfig = {
  /**
   * Workspace areas to hide (see `hideableWorkspaceAreas`). Omitted / absent means hide nothing.
   * Unknown names are ignored.
   */
  hiddenAreas: WorkspaceArea[]
  /**
   * API-reference whitelist by human-readable API name (e.g. `step`, `turn`, `say`), matched
   * against each item's method name. Three states:
   * - `null`: the author did not specify — show ALL APIs.
   * - `[]`: an explicit empty whitelist — hide ALL APIs.
   * - `[names]`: show only the matching APIs.
   */
  apis: string[] | null
}

/** The raw shape as authored in the jsonc block, before normalization. All fields optional. */
type RawCourseConfig = {
  hide?: unknown
  apis?: unknown
}

const emptyConfig: CourseConfig = { hiddenAreas: [], apis: null }

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

/** Parse JSONC (JSON with // and /* *\/ comments and trailing commas). Returns null on failure. */
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
    apis: normalizeApis(raw.apis)
  }
}

function normalizeHiddenAreas(value: unknown): WorkspaceArea[] {
  if (!Array.isArray(value)) return []
  const normalized = value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v): v is WorkspaceArea => isWorkspaceArea(v))
  return [...new Set(normalized)]
}

function normalizeApis(value: unknown): string[] | null {
  // Distinguish "absent" (show all) from "empty array" (hide all).
  if (!Array.isArray(value)) return null
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v !== '')
}

/** All workspace areas, for documenting the config's `hide` option. */
export const configurableHiddenAreas = hideableWorkspaceAreas

function normalizeApiName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** The method name of an API item, e.g. `Sprite.step` -> `step`, `Println` -> `Println`. */
function apiMethodName(item: APIReferenceItem): string {
  const name = item.definition.name ?? ''
  return name.split('.').at(-1) ?? name
}

/**
 * Build an API-reference filter from a course config's `apis` whitelist, or `null` to show all.
 * An empty whitelist yields a filter matching nothing (hide all).
 */
export function buildApiReferenceFilter(apis: string[] | null): ((item: APIReferenceItem) => boolean) | null {
  if (apis == null) return null
  const allowed = new Set(apis.map(normalizeApiName).filter((n) => n !== ''))
  return (item) => allowed.has(normalizeApiName(apiMethodName(item)))
}
