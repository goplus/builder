<script lang="ts">
import { z } from 'zod'
import { debounce } from 'lodash'
import { inject, onBeforeUnmount, provide, watch, type ComputedRef, type InjectionKey } from 'vue'
import { useRouter, type Router } from 'vue-router'
import { useRadar, type Radar, type RadarNodeInfo } from '@/utils/radar'
import { useI18n, type I18n } from '@/utils/i18n'
import { escapeHTML } from '@/utils/utils'
import * as projectApis from '@/apis/project'
import { Project } from '@/models/project'
import { getSignedInUsername } from '@/stores/user'
import { useModalEvents } from '@/components/ui/modal/UIModalProvider.vue'
import { useEditorCtxRef, type EditorCtx } from '../editor/EditorContextProvider.vue'
import { useCodeEditorCtxRef, type CodeEditorCtx } from '../editor/code-editor/context'
import { useMessageEvents } from '../ui/message/UIMessageProvider.vue'
import { Copilot, type ICopilotContextProvider, type ToolDefinition } from './copilot'
import * as toolUse from './custom-elements/ToolUse.vue'
import * as highlightLink from './custom-elements/HighlightLink.vue'
import * as codeLink from './custom-elements/CodeLink'
import * as codeChange from './custom-elements/CodeChange.vue'

const copilotInjectionKey: InjectionKey<Copilot> = Symbol('copilot')

export function useCopilot(): Copilot {
  const copilot = inject(copilotInjectionKey)
  if (!copilot) throw new Error('Copilot not provided')
  return copilot
}

const listProjectsParamsSchema = z.object({
  owner: z
    .string()
    .describe("The owner's username. Defaults to the current-signed-in user. Use * to include projects from all users"),
  keyword: z.string().optional().describe('Keyword in the project name'),
  pageSize: z.number().describe('Number of projects to return per page'),
  pageIndex: z.number().describe('Page index, starting from 1')
})

const listProjectsTool: ToolDefinition = {
  name: 'list_projects',
  description: 'List all projects for a user.',
  parameters: listProjectsParamsSchema,
  async implementation(params: z.infer<typeof listProjectsParamsSchema>) {
    const { total, data } = await projectApis.listProject(params)
    return { total, data: data.map((p) => [p.owner, p.name].map(encodeURIComponent).join('/')) }
  }
}

type ProjectParams = {
  owner: string
  project: string
}

class Retriever {
  constructor(private editorCtxRef: ComputedRef<EditorCtx | undefined>) {}

  async getProject({ owner, project }: ProjectParams, signal?: AbortSignal): Promise<Project> {
    if (this.editorCtxRef.value != null) {
      const currentProject = this.editorCtxRef.value.project
      if (currentProject.owner === owner && currentProject.name === project) return currentProject
    }
    const p = new Project()
    await p.loadFromCloud(owner, project, true, signal)
    return p
  }
}

const getProjectMetadataParamsSchema = z.object({
  owner: z.string().describe('Owner of the project'),
  project: z.string().describe('Project name')
})

class GetProjectMetadataTool implements ToolDefinition {
  name = 'get_project_metadata'
  description = 'Get metadata of a project.'
  parameters = getProjectMetadataParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation({ owner, project }: z.infer<typeof getProjectMetadataParamsSchema>, signal?: AbortSignal) {
    const p = await this.retriever.getProject({ owner, project }, signal)
    const { owner: pOwner, remixedFrom, visibility, description, instructions } = p
    return { owner: pOwner, remixedFrom, visibility, description, instructions }
  }
}

const getProjectSpritesParamsSchema = z.object({
  owner: z.string().describe('Owner of the project'),
  project: z.string().describe('Project name')
})

class GetProjectSpritesTool implements ToolDefinition {
  name = 'get_project_sprites'
  description = 'Get sprites of a project.'
  parameters = getProjectSpritesParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation(params: z.infer<typeof getProjectSpritesParamsSchema>, signal?: AbortSignal) {
    const project = await this.retriever.getProject(params, signal)
    return project.sprites.map((s) => s.name)
  }
}

type LineRangeParams = {
  /** 1-based */
  lineStart?: number
  /** 1-based */
  lineEnd?: number
}

const lineStartSchema = z.number().default(1).describe('Line number to start from, 1-based')
const lineEndSchema = z.number().optional().describe('Line number to end at, 1-based')

function getLines(code: string, { lineStart = 1, lineEnd }: LineRangeParams): Record<string, string> {
  return code
    .split(/\r?\n/)
    .slice(lineStart - 1, lineEnd)
    .reduce<Record<string, string>>((o, line, i) => {
      o['L' + (i + lineStart)] = line
      return o
    }, {})
}

const getProjectStageCodeParamsSchema = z.object({
  owner: z.string().describe('Owner of the project'),
  project: z.string().describe('Project name'),
  lineStart: lineStartSchema,
  lineEnd: lineEndSchema
})

class GetProjectStageCodeTool implements ToolDefinition {
  name = 'get_project_stage_code'
  description = 'Get stage code of a project.'
  parameters = getProjectStageCodeParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation(
    { owner, project, lineStart, lineEnd }: z.infer<typeof getProjectStageCodeParamsSchema>,
    signal?: AbortSignal
  ) {
    const p = await this.retriever.getProject({ owner, project }, signal)
    return getLines(p.stage.code, { lineStart, lineEnd })
  }
}

const getProjectSpriteCodeParamsSchema = z.object({
  owner: z.string().describe('Owner of the project'),
  project: z.string().describe('Project name'),
  sprite: z.string().describe('Sprite name'),
  lineStart: lineStartSchema,
  lineEnd: lineEndSchema
})

class GetProjectSpriteCodeTool implements ToolDefinition {
  name = 'get_project_sprite_code'
  description = 'Get code of a sprite in a project.'
  parameters = getProjectSpriteCodeParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation(
    { owner, project, sprite, lineStart, lineEnd }: z.infer<typeof getProjectSpriteCodeParamsSchema>,
    signal?: AbortSignal
  ) {
    const p = await this.retriever.getProject({ owner, project }, signal)
    const s = p.sprites.find((s) => s.name === sprite)
    if (!s) throw new Error(`Sprite not found: ${sprite}`)
    return getLines(s.code, { lineStart, lineEnd })
  }
}

const getCodeDiagnosticsParamsSchema = z.object({})

class GetCodeDiagnosticsTool implements ToolDefinition {
  name = 'get_code_diagnostics'
  description = 'Get code diagnostics (errors or warnings) of current editing project.'
  parameters = getCodeDiagnosticsParamsSchema

  constructor(private codeEditorCtxRef: ComputedRef<CodeEditorCtx | undefined>) {}

  async implementation(_: z.infer<typeof getCodeDiagnosticsParamsSchema>, signal?: AbortSignal) {
    const codeEditorCtx = this.codeEditorCtxRef.value
    if (codeEditorCtx == null) throw new Error('Code editor context is not available')
    return codeEditorCtx.mustEditor().diagnosticWorkspace(signal)
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
    if (!nodeInfo) throw new Error(`Radar node with ID ${targetId} not found.`)
    const textContent = nodeInfo.getElement()?.textContent ?? ''
    return textContent.length > 500 ? textContent.slice(0, 500) + '...' : textContent
  }
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
const messageEvents = useMessageEvents()
const editorCtxRef = useEditorCtxRef()
const codeEditorCtxRef = useCodeEditorCtxRef()

const retriever = new Retriever(editorCtxRef)
const copilot = new Copilot()

copilot.registerTool(listProjectsTool)
copilot.registerTool(new GetProjectMetadataTool(retriever))
copilot.registerTool(new GetProjectSpritesTool(retriever))
copilot.registerTool(new GetProjectStageCodeTool(retriever))
copilot.registerTool(new GetProjectSpriteCodeTool(retriever))
copilot.registerTool(new GetCodeDiagnosticsTool(codeEditorCtxRef))
copilot.registerCustomElement({
  tagName: toolUse.tagName,
  description: toolUse.detailedDescription,
  attributes: toolUse.attributes,
  isRaw: toolUse.isRaw,
  component: toolUse.default
})
copilot.registerCustomElement({
  tagName: highlightLink.tagName,
  description: highlightLink.detailedDescription,
  attributes: highlightLink.attributes,
  isRaw: highlightLink.isRaw,
  component: highlightLink.default
})
copilot.registerCustomElement({
  tagName: codeLink.tagName,
  description: codeLink.detailedDescription,
  attributes: codeLink.attributes,
  isRaw: codeLink.isRaw,
  component: codeLink.default
})
copilot.registerCustomElement({
  tagName: codeChange.tagName,
  description: codeChange.detailedDescription,
  attributes: codeChange.attributes,
  isRaw: codeChange.isRaw,
  component: codeChange.default
})
copilot.registerTool(new GetUINodeTextContentTool(radar))
copilot.registerContextProvider(new UIContextProvider(radar, i18n))
copilot.registerContextProvider(new UserContextProvider())
copilot.registerContextProvider(new LocationContextProvider(router))

watch(
  router.currentRoute,
  debounce((route) => {
    copilot.notifyUserEvent({ en: 'Page navigation', zh: '页面切换' }, `User navigated to ${route.fullPath}`)
  }, 100)
)

onBeforeUnmount(
  modalEvents.on('open', () => {
    copilot.notifyUserEvent({ en: 'Modal opened', zh: '打开模态框' }, 'User opened a modal dialog')
  })
)
onBeforeUnmount(
  modalEvents.on('close', () => {
    copilot.notifyUserEvent({ en: 'Modal closed', zh: '关闭模态框' }, 'User closed a modal dialog')
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

provide(copilotInjectionKey, copilot)
</script>

<template>
  <slot></slot>
</template>
