/**
 * Course-authoring knowledge for the Copilot, bundled as a skill.
 *
 * The skill documents live next to this file as Markdown (`skills/tutorial-course/`) so they read and review
 * like documents rather than like string literals, and they are bundled as raw text the same way the spx and
 * XGo skills are. Only the Course Editor preloads this skill; every Copilot can still find it in the catalog.
 */

import { mapKeys } from 'lodash'

/**
 * Name of the course-authoring skill, as declared in its `SKILL.md` frontmatter.
 * Consumed by: components/copilot/skills/built-in.ts (re-exported as `skillTutorialCourse`),
 * components/course-editor/copilot/index.ts (preloaded while the Course Editor is open).
 */
export const tutorialCourseSkillName = 'tutorial-course'

const skillFiles = import.meta.glob('./skills/tutorial-course/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>

/**
 * Get bundled course-authoring skill files.
 * @returns The skill's files keyed by path relative to the skill directory (`SKILL.md`, `references/...`).
 * Called by: components/copilot/skills/built-in.ts#createBuiltInSkillRegistry.
 */
export function getTutorialCourseSkillFiles(): Record<string, string> {
  const prefixLen = './skills/tutorial-course/'.length
  return mapKeys(skillFiles, (_, path) => path.slice(prefixLen))
}
