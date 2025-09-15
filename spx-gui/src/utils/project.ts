import type { Project } from '@/models/project'

/** Pattern to detect AI Interaction usage in code */
const aiPlayerPattern = /\sai\.Player/

/** Check if project is using AI Interaction features */
export function isProjectUsingAIInteraction(project: Project): boolean {
  // Check stage code
  if (project.stage.code && aiPlayerPattern.test(project.stage.code)) {
    return true
  }

  // Check all sprite codes
  for (const sprite of project.sprites) {
    if (sprite.code && aiPlayerPattern.test(sprite.code)) {
      return true
    }
  }

  return false
}

/** Check if sign-in is required for running the project */
export function isSignInRequiredForProject(project: Project): boolean {
  // AI Interaction features require sign-in
  if (isProjectUsingAIInteraction(project)) {
    return true
  }

  // Future features that require sign-in can be added here

  return false
}
