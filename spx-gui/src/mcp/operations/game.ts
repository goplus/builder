import { z } from 'zod'
import { getEditorCtx } from '@/pages/editor/context'

export const RunGameArgsSchema = z.object({
  projectName: z.string().describe('The name of the project to run in XBuilder.')
})

export type RunGameOptions = z.infer<typeof RunGameArgsSchema>

export function runGame(options: RunGameOptions) {
  const editorCtx = getEditorCtx()
  const project = editorCtx.project
  const projectName = options.projectName
  if (project.name != projectName) {
    return
  }
  if (!project) {
    return Promise.resolve({
      success: false,
      message: 'Failed to get the current project'
    })
  }

  try {
    return {
      success: true,
      message: `Successfully runned the project "${project.name}"`
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to add sprite:`, errorMessage)

    return {
      success: false,
      message: `Failed to add sprite: ${errorMessage}`
    }
  }
}
