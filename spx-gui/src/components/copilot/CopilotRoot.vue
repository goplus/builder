<script lang="ts">
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { inject, onBeforeUnmount, provide, watch, type InjectionKey } from 'vue'
import { useRouter, type Router } from 'vue-router'
import { useRadar, type Radar, type RadarNodeInfo } from '@/utils/radar'
import { useI18n, type I18n } from '@/utils/i18n'
import { escapeHTML } from '@/utils/utils'
import * as projectApis from '@/apis/project'
import * as projectCloudHelper from '@/models/common/cloud'
import { getSignedInUsername } from '@/stores/user'
import { useModalEvents } from '@/components/ui/modal/UIModalProvider.vue'
import { Copilot, type CustomElementDefinition, type ICopilotContextProvider, type ToolDefinition } from './copilot'
import * as toolUse from './ToolUse.vue'
import * as highlightLink from './HighlightLink.vue'

const copilotInjectionKey: InjectionKey<Copilot> = Symbol('copilot')

export function useCopilot(): Copilot {
  const copilot = inject(copilotInjectionKey)
  if (!copilot) throw new Error('Copilot not provided')
  return copilot
}

const listProjectsParamsSchema = z.object({
  owner: z
    .string()
    .optional()
    .describe(
      "The owner's username. Defaults to the authenticated user if not specified. Use * to include projects from all users"
    ),
  keyword: z.string().optional().describe('Keyword in the project name'),
  pageSize: z.number().optional().describe('Number of projects to return per page'),
  pageIndex: z.number().optional().describe('Page index, starting from 1')
})

const listProjectsTool: ToolDefinition = {
  name: 'list_projects',
  description: 'List all projects for a user.',
  parameters: zodToJsonSchema(listProjectsParamsSchema),
  async implementation(params: z.infer<typeof listProjectsParamsSchema>) {
    const { total, data } = await projectApis.listProject(params)
    return { total, data: data.map((p) => [p.owner, p.name].map(encodeURIComponent).join('/')) }
  }
}

const getProjectMetadataParamsSchema = z.object({
  owner: z.string().describe('Owner of the project'),
  project: z.string().describe('Project name')
})

const getProjectMetadataTool: ToolDefinition = {
  name: 'get_project_metadata',
  description: 'Get metadata of a project.',
  parameters: zodToJsonSchema(getProjectMetadataParamsSchema),
  async implementation(params: z.infer<typeof getProjectMetadataParamsSchema>, signal?: AbortSignal) {
    const preferPublishedContent = false // TODO: preferPublishedContent
    const { metadata } = await projectCloudHelper.load(params.owner, params.project, preferPublishedContent, signal)
    const { owner, remixedFrom, visibility, description, instructions } = metadata
    return { owner, remixedFrom, visibility, description, instructions }
  }
}

const useMcpToolCustomElement: CustomElementDefinition = {
  tagName: toolUse.tagName,
  description: toolUse.description,
  attributes: toolUse.attributes,
  component: toolUse.default
}

const useHighlightLinkCustomElement: CustomElementDefinition = {
  tagName: highlightLink.tagName,
  description: highlightLink.description,
  attributes: highlightLink.attributes,
  component: highlightLink.default
}

class UIContextProvider implements ICopilotContextProvider {
  constructor(
    private radar: Radar,
    private i18n: I18n
  ) {}

  private stringifyNode(node: RadarNodeInfo): string {
    const children = this.stringifyNodes(node.getChildren())
    // TODO: use XMLSerializer?
    if (children.trim() === '')
      return `<node name="${escapeHTML(node.name)}" id="${escapeHTML(node.id)}" desc="${escapeHTML(node.desc)}"/>`
    return `<node name="${escapeHTML(node.name)}" id="${escapeHTML(node.id)}" desc="${escapeHTML(node.desc)}">${children}</node>`
  }

  private stringifyNodes(node: RadarNodeInfo[]): string {
    return node.map((n) => this.stringifyNode(n)).join('')
  }

  provideContext(): string {
    const lang =
      {
        en: 'English',
        zh: 'Chinese'
      }[this.i18n.lang.value] ?? 'Unknown'
    return `# Current UI of XBuilder

Current UI language: ${lang}. Current UI structure is as follows:

<xbuilder>${this.stringifyNodes(this.radar.getRootNodes())}</xbuilder>

DO NOT make up appearance or position (e.g., left/right/top/bottom) of elements, unless explicitly mentioned in the description.
`
  }
}

class UserContextProvider implements ICopilotContextProvider {
  provideContext(): string {
    const signedInUsername = getSignedInUsername()
    const userInfo =
      signedInUsername != null ? `Now the user is signed in with name ${signedInUsername}` : 'The user is not signed in'
    return `# Current user
${userInfo}`
  }
}

class LocationContextProvider implements ICopilotContextProvider {
  constructor(private router: Router) {}
  provideContext(): string {
    return `# Current location
The user is now browsing page with URL: \`${this.router.currentRoute.value.fullPath}\``
  }
}
</script>

<script setup lang="ts">
const radar = useRadar()
const i18n = useI18n()
const router = useRouter()
const modalEvents = useModalEvents()

const copilot = new Copilot()
copilot.registerTool(listProjectsTool)
copilot.registerTool(getProjectMetadataTool)
copilot.registerCustomElement(useMcpToolCustomElement)
copilot.registerCustomElement(useHighlightLinkCustomElement)
copilot.registerContextProvider(new UIContextProvider(radar, i18n))
copilot.registerContextProvider(new UserContextProvider())
copilot.registerContextProvider(new LocationContextProvider(router))

watch(router.currentRoute, (route) => {
  copilot.notifyUserEvent({ en: 'Page navigation', zh: '页面切换' }, `User navigated to ${route.fullPath}`)
})

onBeforeUnmount(
  modalEvents.on('open', () => {
    copilot.notifyUserEvent({ en: 'Modal opened', zh: '打开模态框' }, 'User opened a modal dialog')
  })
)

provide(copilotInjectionKey, copilot)
</script>

<template>
  <slot></slot>
</template>
