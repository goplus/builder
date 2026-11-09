import { mapKeys } from 'lodash'

/** Name of the course-authoring skill, as declared in its `SKILL.md` frontmatter. */
export const tutorialCourseSkillName = 'tutorial-course'

const skillFiles = import.meta.glob('./skills/tutorial-course/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>

/** Get bundled course-authoring skill files. */
export function getTutorialCourseSkillFiles(): Record<string, string> {
  const prefixLen = './skills/tutorial-course/'.length
  return mapKeys(skillFiles, (_, path) => path.slice(prefixLen))
}
