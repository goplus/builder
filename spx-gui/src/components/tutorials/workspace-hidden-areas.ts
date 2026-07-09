import { z } from 'zod'
import { defineComponent, watch } from 'vue'
import {
  editorWorkspaceLayout,
  hideableWorkspaceAreas,
  isWorkspaceArea,
  type WorkspaceArea
} from '@/components/editor/workspace-layout'

export const tagName = 'workspace-hidden-areas'

export const isRaw = false

export const description = 'Hide the listed areas of the editor workspace.'

export const detailedDescription = `Hide the listed areas of the editor workspace, to focus the user on the course \
content. \`areas\` is a comma-separated list of area names. Available areas:
- \`editor-panels\`: the sprites / sounds / stage panels below the game preview
- \`edit-mode-switch\`: the editor-mode (default / map) switcher in the navbar
- \`preview-header\`: the header bar of the game preview (title, publish entry, etc.)
- \`code-editor-tools\`: the tools beside the code editor (document tabs & zoom control)
Use \`areas=""\` to show all areas again. Re-emit this element with a new list whenever the needed areas change or \
you previously made a mistake — the latest one wins. For example, \
<${tagName} areas="editor-panels,edit-mode-switch" /> hides the resource panels and the editor-mode switcher while \
keeping everything else visible.`

export const attributes = z.object({
  areas: z
    .string()
    .describe(
      `Comma-separated names of workspace areas to hide (${hideableWorkspaceAreas.join(', ')}). Empty string shows all.`
    )
})

export type Props = {
  /** Comma-separated names of workspace areas to hide. Empty string shows all. */
  areas: string
}

export default defineComponent<Props>(
  (props) => {
    function apply() {
      const areas = props.areas
        .split(',')
        .map((area) => area.trim())
        // Unknown names are dropped silently: the copilot may emit a name outside the known set,
        // and a partial application is better than none.
        .filter((area): area is WorkspaceArea => isWorkspaceArea(area))
      editorWorkspaceLayout.setHiddenAreas(areas)
    }

    // Re-apply on initial render and when the copilot updates the element with a new `areas` prop.
    watch(() => props.areas, apply, { immediate: true })

    return function render() {
      return null
    }
  },
  {
    name: 'WorkspaceHiddenAreas',
    props: {
      areas: {
        type: String,
        default: ''
      }
    }
  }
)
