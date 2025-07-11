import { copilot, router } from './base'
import { ICopilotContextProvider } from './module_Copilot'
import { RadarNodeInfo, Radar, useRadar } from './module_Radar'
import { useSpotlight } from './module_Spotlight'

class RouteProvider implements ICopilotContextProvider {
  provideContext(): string {
    const currentRoute = router.currentRoute.value
    return `
We are now at page "${currentRoute.name}" with params:
<route-params>
  ${JSON.stringify(currentRoute.params)}
</route-params>
`
  }
}

class UIStateProvider implements ICopilotContextProvider {
  constructor(private radar: Radar) {}

  private humanizeUINode(node: RadarNodeInfo): string {
    return `
  <node id="${node.id}" name="${node.name}" description="${node.description}">
    ${node.getChildren().map(n => this.humanizeUINode(n)).join('\n')}
  </node>`
  }


  provideContext(): string {
    const rootNodes = this.radar.getRootNodes()
    return `
Here's the current UI state:

<ui-state>
${rootNodes.map(n => this.humanizeUINode(n)).join('\n')}
</ui-state>
`
  }
}

function SpotlightLink(props: {
  /** ID for the linked node (from module `Radar`) */
  targetId: string
  /** Tip to show when node revealed */
  tip?: string
  /** Text to display for the link */
  children: string
}): void {
  const radar = useRadar()
  const spotlight = useSpotlight()

  function handleClick() {
    const node = radar.getNodeById(props.targetId)!
    const el = node.getElement()!
    spotlight.reveal(el, props.tip)
  }
}

function App() {

  copilot.registerContextProvider(new RouteProvider())

  const radar = useRadar()
  copilot.registerContextProvider(new UIStateProvider(radar))

  copilot.registerToolsProvider({
    provideTools() {
      return [
        {
          type: 'custom-element',
          tagName: 'spotlight-link',
          description: 'A link that reveals a node when link clicked.',
          attributes: {
            'target-id': { type: 'string', description: 'ID for the linked node' },
            'tip': { type: 'string', description: 'Tip to show when node revealed' },
            'children': { type: 'string', description: 'Text to display for the link' },
          },
          component: SpotlightLink,
        },
      ]
    },
  })
}

