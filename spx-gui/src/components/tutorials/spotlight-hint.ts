import { z } from 'zod'
import { defineComponent, onUnmounted, watch } from 'vue'
import { useRadar } from '@/utils/radar'
import { useSpotlight } from '@/utils/spotlight'
import { useCopilotRound } from '@/components/copilot/context'

export const tagName = 'spotlight-hint'

export const isRaw = false

export const description = 'Proactively highlight a UI element, dimming everything else.'

export const detailedDescription = `Proactively reveal & highlight a specific node in the UI: the node is spotlighted \
while everything else is dimmed with a translucent mask (which does not block interactions), and a short tip is shown \
next to it. Unlike <highlight-link>, which renders a link the user must click first, this element triggers the \
highlight immediately when your message arrives — use it to point the user at the ONE thing they should interact \
with next (e.g. the run button, or an item in the API references panel). Use the node ID provided in the UI \
information. The highlight dismisses automatically after a few seconds. Use at most one per message. For example, \
<${tagName} target-id="xxxyyy" tip="Click here!" /> highlights the node with ID "xxxyyy" and shows the tip \
"Click here!" beside it.`

export const attributes = z.object({
  'target-id': z.string().describe('ID for the target node (from the UI information)'),
  tip: z
    .string()
    .optional()
    .describe('Short tip shown next to the highlighted node, in user language, e.g. "Click here!"')
})

export type Props = {
  /** ID for the target node (from module `Radar`) */
  targetId: string
  /** Tip shown next to the highlighted node */
  tip?: string
}

export default defineComponent<Props>(
  (props) => {
    const radar = useRadar()
    const spotlight = useSpotlight()
    const round = useCopilotRound()

    let retryTimer: ReturnType<typeof setTimeout> | null = null

    function reveal(): boolean {
      const nodeInfo = radar.getNodeById(props.targetId)
      if (nodeInfo == null || !nodeInfo.visible) return false
      spotlight.reveal(nodeInfo.getElement(), props.tip ?? '', { mask: true })
      return true
    }

    // Auto-reveal is gated to the current, live round so a restored chat doesn't re-trigger
    // highlights for old guidance (same gating as the code guides).
    watch(
      () => [props.targetId, props.tip, round?.round.isLive, round?.isLastRound()] as const,
      () => {
        if (round != null && !(round.round.isLive && round.isLastRound())) return
        if (reveal()) return
        // The target may mount slightly later than the message (e.g. inside a panel that is
        // still opening) — retry once instead of failing loudly.
        if (retryTimer != null) clearTimeout(retryTimer)
        retryTimer = setTimeout(reveal, 500)
      },
      { immediate: true }
    )

    onUnmounted(() => {
      if (retryTimer != null) clearTimeout(retryTimer)
    })

    return function render() {
      return null
    }
  },
  {
    name: 'SpotlightHint',
    props: {
      targetId: {
        type: String,
        required: true
      },
      tip: {
        type: String,
        default: ''
      }
    }
  }
)
