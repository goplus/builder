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
    editorCtx.runtime.setRunning({ mode: 'debug', initializing: true })
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

export const StopGameArgsSchema = z.object({
  projectName: z.string().describe('The name of the project to stop in XBuilder.')
})

export type StopGameOptions = z.infer<typeof RunGameArgsSchema>

export async function stopGame(options : StopGameOptions) {
  const projectName = options.projectName
  const editorCtx = getEditorCtx()
  const project = editorCtx.project
  if (!project) {
    return Promise.resolve({
      success: false,
      message: 'Failed to get the current project'
    })
  }

  if (project.name != projectName) {
    return
  }

  try {
    editorCtx.runtime.setRunning({ mode: 'none' })
    return {
      success: true,
      message: `Successfully stopped the project "${project.name}"`
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