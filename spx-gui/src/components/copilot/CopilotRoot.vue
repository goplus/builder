<script lang="ts">
import { z } from 'zod'
import { debounce } from 'lodash'
import { onBeforeUnmount, onUnmounted, toValue, watch, type WatchSource } from 'vue'
import { useRouter, type Router } from 'vue-router'
import { useRadar, type Radar, type RadarNodeInfo } from '@/utils/radar'
import { useI18n, type I18n } from '@/utils/i18n'
import { escapeHTML, unicodeSafeSlice, until } from '@/utils/utils'
import { useIsRouteLoaded } from '@/utils/route-loading'
import * as projectApis from '@/apis/project'
import { useMessageEvents, useModalEvents } from '@/components/ui'
import { Copilot, type ICopilotContextProvider, type SessionExported, type ToolDefinition } from './copilot'
import * as pageLink from './custom-elements/PageLink'
import * as highlightLink from './custom-elements/HighlightLink.vue'
import { useSignedInStateQuery, type SignedInState } from '@/stores/user'
import { userSessionStorageRef } from '@/utils/user-storage'
import { provideCopilot } from './context'
import { registerSkillSupport } from './skills'

const listProjectsParamsSchema = z.object({
  owner: z
    .string()
    .describe("The owner's username. Defaults to the current-signed-in user. Use * to include projects from all users"),
  keyword: z.string().optional().describe('Keyword in the project display name or project name'),
  pageSize: z.number().describe('Number of projects to return per page'),
  pageIndex: z.number().describe('Page index, starting from 1')
})

const listProjectsTool: ToolDefinition = {
  name: 'list_projects',
  description: 'List all projects for a user.',
  parameters: listProjectsParamsSchema,
  async implementation(params: z.infer<typeof listProjectsParamsSchema>) {
    const { total, data } = await projectApis.listProject(params)
    return { total, data: data.map((project) => [project.owner, project.name].map(encodeURIComponent).join('/')) }
  }
}

const getUINodeTextContentParamsSchema = z.object({
  targetId: z.string().describe('ID of the UI node to get content')
})

class GetUINodeTextContentTool implements ToolDefinition {
  name = 'get_ui_node_text_content'
  description = 'Get text content of a UI node by its ID.'
  parameters = getUINodeTextContentParamsSchema

  constructor(private radar: Radar) {}

  async implementation({ targetId }: z.infer<typeof getUINodeTextContentParamsSchema>) {
    const nodeInfo = this.radar.getNodeById(targetId)
    if (nodeInfo == null) throw new Error(`Radar node with ID ${targetId} not found.`)
    const textContent = nodeInfo.getElement()?.textContent ?? ''
    return textContent.length > 500 ? unicodeSafeSlice(textContent, 0, 500) + '...' : textContent
  }
}

class UIContextProvider implements ICopilotContextProvider {
  constructor(
    private radar: Radar,
    private i18n: I18n
  ) {}

  private serializeNode(attrs: Record<string, string>, childrenStr: string) {
    const attrsStr = Object.entries(attrs)
      .filter(([_, value]) => value != null && value !== '')
      .map(([key, value]) => `${key}="${escapeHTML(value)}"`)
      .join(' ')
    if (childrenStr.trim() === '') {
      return `<n ${attrsStr}/>`
    }
    return `<n ${attrsStr}>${childrenStr}</n>`
  }

  private stringifyNode(node: RadarNodeInfo): string {
    const childrenStr = this.stringifyNodes(node.getChildren())
    return this.serializeNode(
      {
        name: node.name,
        id: node.id,
        desc: node.desc
      },
      childrenStr
    )
  }

  private stringifyNodes(nodes: RadarNodeInfo[]): string {
    return nodes.map((node) => this.stringifyNode(node)).join('')
  }

  provideContext(): string {
    const lang =
      {
        en: 'English',
        zh: 'Chinese'
      }[this.i18n.lang.value] ?? 'Unknown'
    return `# Current UI of XBuilder

Current UI language: ${lang}.

Current UI structure (\`n\` for \`node\`):

<xbuilder>${this.stringifyNodes(this.radar.getRootNodes())}</xbuilder>

DO NOT make up appearance or position (e.g., left/right/top/bottom) of any element, unless it is explicitly mentioned in the description.

If there's an API References UI in code editor, encourage the user to insert code by dragging corresponding API items (if there is) into code editor, instead of typing manually.`
  }
}

class UserContextProvider implements ICopilotContextProvider {
  constructor(private signedInState: WatchSource<SignedInState | null>) {}

  provideContext(): string {
    const signedInState = toValue(this.signedInState)
    const userInfo =
      signedInState == null
        ? 'The signed-in state is still loading'
        : signedInState.isSignedIn
          ? `Now the user is signed in with name "${signedInState.user.username}"`
          : 'The user is not signed in'
    return `# Current user
${userInfo}`
  }
}

class LocationContextProvider implements ICopilotContextProvider {
  constructor(private router: Router) {}

  provideContext(): string {
    return `# Current location
The user is now browsing page with path: \`${this.router.currentRoute.value.fullPath}\``
  }
}
</script>

<script setup lang="ts">
const radar = useRadar()
const i18n = useI18n()
const router = useRouter()
const modalEvents = useModalEvents()
const messageEvents = useMessageEvents()
const signedInStateQuery = useSignedInStateQuery()
const copilot = new Copilot()
const disposeSkillSupport = registerSkillSupport(copilot)
const sessionStorageRef = userSessionStorageRef<SessionExported | null>('spx-gui-copilot-session', null)

copilot.syncSessionWith({
  get() {
    return sessionStorageRef.value
  },
  set(value) {
    sessionStorageRef.value = value
  }
})

onUnmounted(() => {
  disposeSkillSupport()
  copilot.dispose()
})

copilot.registerTool(listProjectsTool)
copilot.registerCustomElement({
  tagName: pageLink.tagName,
  description: pageLink.detailedDescription,
  attributes: pageLink.attributes,
  isRaw: pageLink.isRaw,
  component: pageLink.default
})
copilot.registerCustomElement({
  tagName: highlightLink.tagName,
  description: highlightLink.detailedDescription,
  attributes: highlightLink.attributes,
  isRaw: highlightLink.isRaw,
  component: highlightLink.default
})
copilot.registerTool(new GetUINodeTextContentTool(radar))
copilot.registerContextProvider(new UIContextProvider(radar, i18n))
copilot.registerContextProvider(new UserContextProvider(signedInStateQuery.data))
copilot.registerContextProvider(new LocationContextProvider(router))

const isRouteLoaded = useIsRouteLoaded()

watch(
  router.currentRoute,
  debounce(async (route) => {
    await until(isRouteLoaded)
    copilot.notifyUserEvent({ en: 'Page navigation', zh: '页面切换' }, `User navigated to ${route.fullPath}`)
  }, 100)
)

onBeforeUnmount(
  modalEvents.on('open', () => {
    copilot.notifyUserEvent({ en: 'Modal opened', zh: '打开模态框' }, 'User opened a modal dialog')
  })
)
onBeforeUnmount(
  modalEvents.on('resolved', () => {
    copilot.notifyUserEvent(
      { en: 'Operation completed in modal', zh: '模态框中操作完成' },
      'User completed operation in modal'
    )
  })
)
onBeforeUnmount(
  modalEvents.on('cancelled', () => {
    copilot.notifyUserEvent(
      { en: 'Operation cancelled in modal', zh: '模态框中操作取消' },
      'User cancelled operation in modal'
    )
  })
)

onBeforeUnmount(
  messageEvents.on('message', ({ type, content }) => {
    copilot.notifyUserEvent(
      { en: 'UI Notification', zh: '消息提示' },
      `A ${type} notification showed with content: ${content}`
    )
  })
)

provideCopilot(copilot)
</script>

<template>
  <slot />
</template>
