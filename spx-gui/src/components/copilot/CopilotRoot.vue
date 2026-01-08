<script lang="ts">
import { z } from 'zod'
import dayjs from 'dayjs'
import { debounce } from 'lodash'
import {
  inject,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  provide,
  watch,
  type ComputedRef,
  type InjectionKey
} from 'vue'
import { useRouter, type Router } from 'vue-router'
import { useRadar, type Radar, type RadarNodeInfo } from '@/utils/radar'
import { useI18n, type I18n } from '@/utils/i18n'
import { escapeHTML, unicodeSafeSlice, until } from '@/utils/utils'
import { useIsRouteLoaded } from '@/utils/route-loading'
import * as projectApis from '@/apis/project'
import type { Sprite } from '@/models/sprite'
import { Project } from '@/models/project'
import { getSignedInUsername } from '@/stores/user'
import { useModalEvents } from '@/components/ui/modal/UIModalProvider.vue'
import { useEditorCtxRef, type EditorCtx } from '../editor/EditorContextProvider.vue'
import { useCodeEditorCtxRef, type CodeEditorCtx } from '../editor/code-editor/context'
import { getCodeFilePath, isSelectionEmpty, textDocumentId2CodeFileName } from '../editor/code-editor/common'
import type { TextDocument } from '../editor/code-editor/text-document'
import { useMessageEvents } from '../ui/message/UIMessageProvider.vue'
import { Copilot, type ICopilotContextProvider, type SessionExported, type ToolDefinition } from './copilot'
import * as toolUse from './custom-elements/ToolUse'
import * as pageLink from './custom-elements/PageLink'
import * as highlightLink from './custom-elements/HighlightLink.vue'
import * as codeLink from './custom-elements/CodeLink'
import * as codeChange from './custom-elements/CodeChange.vue'
import { codeFilePathSchema, parseProjectIdentifier, projectIdentifierSchema } from './common'
import { userSessionStorageRef } from '@/utils/user-storage'

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

class Retriever {
  constructor(private editorCtxRef: ComputedRef<EditorCtx | undefined>) {}

  async getProject(project: string | undefined, signal?: AbortSignal): Promise<Project> {
    const currentProject = this.editorCtxRef.value?.project
    if (project == null) {
      if (currentProject == null) throw new Error('No project specified and no current editing project available')
      return currentProject
    }
    const { owner, name } = parseProjectIdentifier(project)
    if (currentProject != null && currentProject.owner === owner && currentProject.name === name) {
      return currentProject
    }
    const p = new Project()
    await p.loadFromCloud(owner, name, true, signal)
    return p
  }
}

const getProjectMetadataParamsSchema = z.object({
  project: projectIdentifierSchema
})

class GetProjectMetadataTool implements ToolDefinition {
  name = 'get_project_metadata'
  description = 'Get metadata of a project.'
  parameters = getProjectMetadataParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation({ project }: z.infer<typeof getProjectMetadataParamsSchema>, signal?: AbortSignal) {
    const p = await this.retriever.getProject(project, signal)
    const { owner: pOwner, remixedFrom, visibility, description, instructions } = p
    return { owner: pOwner, remixedFrom, visibility, description, instructions }
  }
}

function getProjectContent(project: Project) {
  const physics = project.stage.physics
  return `\
### Sprites (num: ${project.sprites.length})
${project.sprites.map((sprite) => `- ${sprite.name}`).join('\n')}
### Sounds (num: ${project.sounds.length})
${project.sounds.map((sound) => `- ${sound.name}`).join('\n')}
### Backdrops (num: ${project.stage.backdrops.length})
${project.stage.backdrops.map((backdrop) => `- ${backdrop.name}`).join('\n')}
### Widgets (num: ${project.stage.widgets.length})
${project.stage.widgets.map((widget) => `- ${widget.name}`).join('\n')}
### physics: ${physics.enabled ? 'Enabled' : 'Disabled (Must enable in Map Edit Mode > Global Config for ALL physical features to take effect)'}`
}

const getProjectContentParamsSchema = z.object({
  project: projectIdentifierSchema
})

class GetProjectContentTool implements ToolDefinition {
  name = 'get_project_content'
  description = 'Get content of a project.'
  parameters = getProjectContentParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation({ project }: z.infer<typeof getProjectContentParamsSchema>, signal?: AbortSignal) {
    const p = await this.retriever.getProject(project, signal)
    return getProjectContent(p)
  }
}

function getSpriteContent(sprite: Sprite) {
  return {
    name: sprite.name,
    costumes: sprite.costumes.map((c) => c.name),
    animations: sprite.animations.map((a) => a.name),
    heading: sprite.heading,
    x: sprite.x,
    y: sprite.y,
    size: sprite.size,
    rotationStyle: sprite.rotationStyle,
    visible: sprite.visible,
    codeLinesNum: sprite.code.split(/\r?\n/).length
  }
}

const getSpriteContentParamsSchema = z.object({
  project: projectIdentifierSchema,
  spriteName: z.string().describe('Name of the sprite')
})

class GetSpriteContentTool implements ToolDefinition {
  name = 'get_sprite_content'
  description = 'Get content of a sprite in a project.'
  parameters = getSpriteContentParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation({ project, spriteName }: z.infer<typeof getSpriteContentParamsSchema>, signal?: AbortSignal) {
    const p = await this.retriever.getProject(project, signal)
    const sprite = p.sprites.find((s) => s.name === spriteName)
    if (sprite == null) throw new Error(`Sprite "${spriteName}" not found in project "${project}"`)
    return getSpriteContent(sprite)
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

/** Process code content and return in LLM-friendly format. */
function processCode(code: string, { lineStart = 1, lineEnd }: LineRangeParams) {
  const allLines = code.split(/\r?\n/)
  const sampledLines = allLines.slice(lineStart - 1, lineEnd).reduce<Record<string, string>>((o, line, i) => {
    o[i + lineStart] = line
    return o
  }, {})
  return {
    lineCount: allLines.length,
    sampledLines
  }
}

const getProjectCodeParamsSchema = z.object({
  project: projectIdentifierSchema,
  file: codeFilePathSchema,
  lineStart: lineStartSchema,
  lineEnd: lineEndSchema
})

class GetProjectCodeTool implements ToolDefinition {
  name = 'get_project_code'
  description = 'Get code content of a file in project.'
  parameters = getProjectCodeParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation(
    { project, file, lineStart, lineEnd }: z.infer<typeof getProjectCodeParamsSchema>,
    signal?: AbortSignal
  ) {
    const p = await this.retriever.getProject(project, signal)
    if (p.stage.codeFilePath === file) return processCode(p.stage.code, { lineStart, lineEnd })
    const sprite = p.sprites.find((s) => s.codeFilePath === file)
    if (sprite == null) throw new Error(`Code file ${file} not found in project ${project}`)
    return processCode(sprite.code, { lineStart, lineEnd })
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
    return textContent.length > 500 ? unicodeSafeSlice(textContent, 0, 500) + '...' : textContent
  }
}

class UIContextProvider implements ICopilotContextProvider {
  constructor(
    private radar: Radar,
    private i18n: I18n
  ) {}

  private serializeNode(attrs: Record<string, string>, childrenStr: string) {
    // TODO: use XMLSerializer?
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

Current UI language: ${lang}.

Current UI structure (\`n\` for \`node\`):

<xbuilder>${this.stringifyNodes(this.radar.getRootNodes())}</xbuilder>

DO NOT make up appearance or position (e.g., left/right/top/bottom) of any element, unless it is explicitly mentioned in the description.

If there's an API References UI in code editor, encourage the user to insert code by dragging corresponding API items (if there is) into code editor, instead of typing manually.`
  }
}

class UserContextProvider implements ICopilotContextProvider {
  provideContext(): string {
    const signedInUsername = getSignedInUsername()
    const userInfo =
      signedInUsername != null
        ? `Now the user is signed in with name "${signedInUsername}"`
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

class ProjectContextProvider implements ICopilotContextProvider {
  constructor(private editorCtxRef: ComputedRef<EditorCtx | undefined>) {}
  provideContext(): string {
    const project = this.editorCtxRef.value?.project
    if (project == null) return ''
    return `# Current project
The user is now working on project: ${project.owner}/${project.name}
## Project content
${getProjectContent(project)}`
  }
}

class SpriteContextProvider implements ICopilotContextProvider {
  constructor(private editorCtxRef: ComputedRef<EditorCtx | undefined>) {}
  provideContext(): string {
    const sprite = this.editorCtxRef.value?.state.selectedSprite
    if (sprite == null) return ''
    return `# Current sprite content
${JSON.stringify(getSpriteContent(sprite))}`
  }
}

class CodeContextProvider implements ICopilotContextProvider {
  constructor(private codeEditorCtxRef: ComputedRef<CodeEditorCtx | undefined>) {}

  private sampleCode(activeTextDocument: TextDocument, line: number) {
    const threshold = 10
    const lineStart = Math.max(line - threshold, 1)
    const lineEnd = lineStart + threshold * 2
    const code = activeTextDocument.getValue()
    return processCode(code, { lineStart, lineEnd })
  }

  provideContext(): string {
    const codeEditorUI = this.codeEditorCtxRef.value?.getEditor()?.getAttachedUI()
    if (codeEditorUI == null) return ''
    const { activeTextDocument, cursorPosition, selection } = codeEditorUI
    if (activeTextDocument == null) return ''
    const codeFilePath = getCodeFilePath(activeTextDocument.id.uri)
    const cursorPositionStr =
      cursorPosition == null ? 'None' : `Line ${cursorPosition.line}, Column ${cursorPosition.column}`
    const selectionStr =
      selection == null || isSelectionEmpty(selection)
        ? 'None'
        : `From Line ${selection.start.line}, Column ${selection.start.column} to Line ${selection.position.line}, Column ${selection.position.column}`
    let result = `# Current code
The user is now viewing / editing code of file \`${codeFilePath}\`. \
Cursor position: ${cursorPositionStr}. \
Selection: ${selectionStr}.`
    const code = this.sampleCode(activeTextDocument, cursorPosition?.line ?? 1)
    result += `
Code content of \`${codeFilePath}\`:
${JSON.stringify(code)}`
    return result
  }
}

class RuntimeContextProvider implements ICopilotContextProvider {
  constructor(private editorCtxRef: ComputedRef<EditorCtx | undefined>) {}

  provideContext(): string {
    const runtime = this.editorCtxRef.value?.state.runtime
    if (runtime == null) return ''
    const outputs = runtime.outputs
    if (outputs.length === 0) return ''
    const maxOutputs = 50
    const recentOutputs = outputs.slice(-maxOutputs)
    const outputsStr = recentOutputs
      .map((output) => {
        const time = dayjs(output.time).format('HH:mm:ss.SSS')
        const kindStr = output.kind === 'error' ? 'ERROR' : 'LOG'
        const sourceStr = output.source
          ? ` [${textDocumentId2CodeFileName(output.source.textDocument).en}:${output.source.range.start.line}]`
          : ''
        return `[${time}] ${kindStr}${sourceStr}: ${output.message.trim()}`
      })
      .join('\n')
    return `# Game runtime output
Recent game runtime outputs (last ${recentOutputs.length} of ${outputs.length}):
${outputsStr}`
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
onUnmounted(() => copilot.dispose())

copilot.registerTool(listProjectsTool)
copilot.registerTool(new GetProjectMetadataTool(retriever))
copilot.registerTool(new GetProjectContentTool(retriever))
copilot.registerTool(new GetSpriteContentTool(retriever))
copilot.registerTool(new GetProjectCodeTool(retriever))
copilot.registerTool(new GetCodeDiagnosticsTool(codeEditorCtxRef))
copilot.registerCustomElement({
  tagName: toolUse.tagName,
  description: toolUse.detailedDescription,
  attributes: toolUse.attributes,
  isRaw: toolUse.isRaw,
  component: toolUse.default
})
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
copilot.registerContextProvider(new ProjectContextProvider(editorCtxRef))
copilot.registerContextProvider(new SpriteContextProvider(editorCtxRef))
copilot.registerContextProvider(new CodeContextProvider(codeEditorCtxRef))
copilot.registerContextProvider(new RuntimeContextProvider(editorCtxRef))

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

watch(
  () => editorCtxRef.value?.state.runtime,
  (editorRuntime, _, onCleanup) => {
    if (editorRuntime == null) return
    const unlisten = editorRuntime.on('didExit', (code) => {
      if (code !== 0) return
      copilot.notifyUserEvent({ en: 'Game exited with code 0', zh: '游戏正常退出' }, `Game exited with code ${code}`)
    })
    onCleanup(unlisten)
  },
  { immediate: true }
)

provide(copilotInjectionKey, copilot)

const sessionRef = userSessionStorageRef<SessionExported | null>('spx-gui-copilot-session', null)
onMounted(() => {
  copilot.syncSessionWith({
    set(value) {
      sessionRef.value = value
    },
    get() {
      return sessionRef.value
    }
  })
})
</script>

<template>
  <slot></slot>
</template>
