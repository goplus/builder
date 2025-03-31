import { useAddSpriteFromCanvos } from '@/components/asset'
import { getEditorCtx } from '@/pages/editor/context'
import { z } from 'zod'

export const AddSpriteFromCanvosArgsSchema = z.object({
  spriteName: z
    .string()
    .describe('The identifier of the specific sprite or visual component to add to the current SPX workspace.'),
  size: z.number().describe('The size of the square in pixels'),
  color: z.string().describe('The color of the square (CSS color format)')
})

export type AddSpriteFromCanvosOptions = z.infer<typeof AddSpriteFromCanvosArgsSchema>

/**
 * Add a new sprite to the currently active project.
 * @param spriteName - The name to assign to the new sprite
 * @param size - The size of the square in pixels
 * @param color - The color of the square (CSS color format)
 * @returns A promise resolving to an object with success status and optional message
 */
export async function addSpriteFromCanvos(options: AddSpriteFromCanvosOptions) {
  const spriteName = options.spriteName
  const size = options.size
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
    // 添加精灵到项目
    await useAddSpriteFromCanvos(project, spriteName, size, color)()

    // 保存更改到云端
    await project.saveToCloud()

    return {
      success: true,
      message: `Successfully added sprite "${spriteName}" to project "${project.name}"`
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
