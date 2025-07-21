<script lang="ts">
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { inject, provide, type InjectionKey } from 'vue'
import CopilotUI from './CopilotUI.vue'
import { Copilot, type CustomElementDefinition, type ICopilotContextProvider, type ToolDefinition } from './copilot'
import * as projectCloudHelper from '@/models/common/cloud'
import * as toolUse from './ToolUse.vue'
import * as highlightLink from './HighlightLink.vue'
import { useRadar, type Radar, type RadarNodeInfo } from '@/utils/radar'
import { useI18n, type I18n } from '@/utils/i18n'
import { getSignedInUsername } from '@/stores/user'
import { escapeHTML } from '@/utils/utils'

const copilotInjectionKey: InjectionKey<Copilot> = Symbol('copilot')

export function useCopilot(): Copilot {
  const copilot = inject(copilotInjectionKey)
  if (!copilot) throw new Error('Copilot not provided')
  return copilot
}

const readProjectMetadataParamsSchema = z.object({
  owner: z.string().describe('Owner of the project'),
  project: z.string().describe('Project name')
})

const readProjectMetadataTool: ToolDefinition = {
  name: 'read_project_metadata',
  description: 'Read metadata of a project.',
  parameters: zodToJsonSchema(readProjectMetadataParamsSchema),
  async implementation(params: z.infer<typeof readProjectMetadataParamsSchema>, signal?: AbortSignal) {
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
  provideContext(): string {
    const location = window.location
    return `# Current location
The user is now browsing page with URL: \`${location.pathname + location.search + location.hash}\``
  }
}
</script>

<script setup lang="ts">
const radar = useRadar()
const i18n = useI18n()

const copilot = new Copilot()
copilot.registerTool(readProjectMetadataTool)
copilot.registerCustomElement(useMcpToolCustomElement)
copilot.registerCustomElement(useHighlightLinkCustomElement)
copilot.registerContextProvider(new UIContextProvider(radar, i18n))
copilot.registerContextProvider(new UserContextProvider())
copilot.registerContextProvider(new LocationContextProvider())

provide(copilotInjectionKey, copilot)
</script>

<template>
  <slot />
  <CopilotUI :copilot="copilot" />
</template>
