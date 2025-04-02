import { getEditorCtx } from '@/pages/editor/context'
import { z } from 'zod'

export const AddStageBackdropFromCanvosArgsSchema = z.object({
  backdropName: z
    .string()
    .describe('The identifier of the specific sprite or visual component to add to the current SPX workspace.'),
  color: z.string().describe('The color of the backdrop (CSS color format)')
})

export type AddStageBackdropFromCanvosOptions = z.infer<typeof AddStageBackdropFromCanvosArgsSchema>

/**
 * Add a new sprite to the currently active project.
 * @param backdropName - The name to assign to the new stage backdrop
 * @param color - The color of the square (CSS color format)
 * @returns A promise resolving to an object with success status and optional message
 */
export async function addStageBackdropFromCanvos(options: AddStageBackdropFromCanvosOptions) {
  const backdropName = options.backdropName
  const color = options.color
  const editorCtx = getEditorCtx()
  const project = editorCtx.project
  if (!project) {
    return {
      success: false,
      message: 'Failed to get the current project'
    }
  }

  try {
    // add backdrop to project
    await project.addBackdropFromCanvos(backdropName, color)
    // save changes to cloud
    await project.saveToCloud()

    return {
      success: true,
      message: `Successfully added backdrop "${backdropName}" to project "${project.name}"`
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to add backdrop:`, errorMessage)

    return {
      success: false,
      message: `Failed to add backdrop: ${errorMessage}`
    }
  }
}
