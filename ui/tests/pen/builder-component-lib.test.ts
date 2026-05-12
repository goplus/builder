import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { blue, green, grey, purple, red, turquoise, yellow } from '../../../spx-gui/src/components/ui/tokens/colors'
import { boxShadow, radius, spacing } from '../../../spx-gui/src/components/ui/tokens'

type PenNode = {
  id?: string
  name?: string
  ref?: string
  reusable?: boolean
  imports?: Record<string, string>
  slot?: string[]
  children?: PenNode[]
  [key: string]: unknown
}

type PenVariable = {
  type?: string
  value?: Array<{
    value?: unknown
    theme?: Record<string, string>
  }>
}

type PenFont = {
  name?: string
  url?: string
}

type PenDocument = PenNode & {
  variables?: Record<string, PenVariable>
  fonts?: PenFont[]
}

const CurrentDir = dirname(fileURLToPath(import.meta.url))
const RepoRoot = resolve(CurrentDir, '../../..')
const UIRootPath = resolve(RepoRoot, 'ui')
const SpxGuiRoot = resolve(RepoRoot, 'spx-gui')
const LibraryPath = resolve(UIRootPath, 'components/spx/builder-component.lib.pen')
const CommunityExplorePath = resolve(UIRootPath, 'pages/spx/community-explore.pen')
const CommunityHomePath = resolve(UIRootPath, 'pages/spx/community-home.pen')
const CommunityLoginPath = resolve(UIRootPath, 'pages/spx/community-login.pen')
const CommunityProjectPath = resolve(UIRootPath, 'pages/spx/community-project.pen')
const CommunitySearchPath = resolve(UIRootPath, 'pages/spx/community-search.pen')
const CommunityUserPath = resolve(UIRootPath, 'pages/spx/community-user.pen')
const EditorMapPath = resolve(UIRootPath, 'pages/spx/editor-map.pen')
const EditorSpritePath = resolve(UIRootPath, 'pages/spx/editor-sprite.pen')
const EditorStagePath = resolve(UIRootPath, 'pages/spx/editor-stage.pen')
const TutorialPath = resolve(UIRootPath, 'pages/spx/tutorial.pen')
const ConfigPanelPath = resolve(SpxGuiRoot, 'src/components/editor/common/viewer/quick-config/common/ConfigPanel.vue')
const UIModalPath = resolve(SpxGuiRoot, 'src/components/ui/modal/UIModal.vue')
const UIDropdownPath = resolve(SpxGuiRoot, 'src/components/ui/UIDropdown.vue')
const ProjectItemPath = resolve(SpxGuiRoot, 'src/components/project/ProjectItem.vue')
const LegacyCommunityExploreLibraryRefIds = ['le3CV', '832Oq', 'pwk0c', 'rIuyc']
const TurquoiseSteps = [100, 200, 300, 400, 500, 600, 700] as const
const YellowSteps = [100, 200, 300, 400, 500, 600, 700] as const
const PurpleSteps = [100, 200, 300, 400, 500, 600, 700] as const
const LibraryPurpleSteps = [100, 200, 300, 400, 500, 600] as const
const BlueSteps = [100, 200, 300, 400, 500, 600, 700] as const
const RedSteps = [100, 200, 300, 400, 500, 600] as const
const GreenSteps = [100, 200, 300, 400, 500, 600] as const
const LibraryGreenSteps = [400, 500, 600] as const
const GreySteps = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000] as const
const RadiusSteps = [1, 2, 3, 4] as const
const SpaceSteps = [0, 1, 2, 3, 4, 5, 6] as const
const LineHeightSteps = [1, 2, 3, 4] as const
const MaskSteps = [1, 2] as const
const CodeThemeNames = ['black', 'blue', 'crimson', 'green', 'operator', 'purple', 'turmeric'] as const
const ExpectedTurquoisePalette = {
  100: '#F3FBFC',
  200: '#EAF9FA',
  300: '#AFE7EC',
  400: '#3FCDD9',
  500: '#36C2CF',
  600: '#2B9BA5',
  700: '#20747C'
} as const
const ExpectedYellowPalette = {
  100: '#FFF8F1',
  200: '#FFF1E2',
  300: '#FFE2C2',
  400: '#FFC584',
  500: '#FF9F33',
  600: '#CE8029',
  700: '#9D611F'
} as const
const ExpectedPurplePalette = {
  100: '#FAF8FF',
  200: '#F6F1FF',
  300: '#E2D4FF',
  400: '#B390FF',
  500: '#A074FF',
  600: '#926AE8',
  700: '#7252B5'
} as const
const ExpectedBluePalette = {
  100: '#EFF7FF',
  200: '#DFEFFF',
  300: '#B8E0FF',
  400: '#78C7FF',
  500: '#4CB8FF',
  600: '#0693F1',
  700: '#0076CE'
} as const
const ExpectedRedPalette = {
  100: '#FEEFEF',
  200: '#FDC7C7',
  300: '#FF97A0',
  400: '#F15D64',
  500: '#EF4149',
  600: '#BC292E'
} as const
const ExpectedGreenPalette = {
  100: '#E0F8E3',
  200: '#CBF1CD',
  300: '#B0EA90',
  400: '#90E05A',
  500: '#63CE29',
  600: '#3CA80C'
} as const
const ExpectedGreyPalette = {
  100: '#FFFFFF',
  200: '#FBFCFD',
  300: '#F6F8FA',
  400: '#EAEFF3',
  500: '#D9DFE5',
  600: '#CBD2D8',
  700: '#A7B1BB',
  800: '#6E7781',
  900: '#57606A',
  1000: '#24292F'
} as const
const ExpectedCodeThemePalette = {
  black: '#000000',
  blue: '#0774CD',
  crimson: '#9C2C2C',
  green: '#139707',
  operator: '#DB1C2B',
  purple: '#892BA8',
  turmeric: '#B08A01'
} as const
const ExpectedRadiusScale = {
  1: 4,
  2: 8,
  3: 10,
  4: 12,
  full: 100
} as const
const ExpectedSpaceScale = {
  0: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24
} as const
const ExpectedBoxShadowScale = {
  panel: '0px 6px 16px 0px rgba(36, 41, 47, 0.05)',
  surface: '0px 4px 12px 0px rgba(36, 41, 47, 0.08)',
  surfaceStrong: '0px 8px 24px 8px rgba(36, 41, 47, 0.05)',
  accent: '0px 4px 12px 0px rgba(175, 231, 236, 0.65)',
  subtle: '0px 0px 4px 0px rgba(36, 41, 47, 0.1)'
} as const
const ExpectedCodeBoxShadowScale = {
  panel: ExpectedBoxShadowScale.panel,
  surface: ExpectedBoxShadowScale.surface,
  surfaceStrong: ExpectedBoxShadowScale.surfaceStrong,
  accent: ExpectedBoxShadowScale.accent
} as const
const ExpectedTextLineHeightScale = {
  1: 1.4,
  2: 1.5,
  3: 1.57143,
  4: 1.6
} as const
const ExpectedMaskScale = {
  1: '#24292F99',
  2: '#24292FBF'
} as const
const ExpectedPenShadowEffectPresets = {
  panel: { color: '#24292F0D', x: 0, y: 6, blur: 16 },
  surface: { color: '#24292F14', x: 0, y: 4, blur: 12 },
  surfaceStrong: { color: '#24292F0D', x: 0, y: 8, blur: 24, spread: 8 },
  accent: { color: '#AFE7ECA6', x: 0, y: 4, blur: 12 },
  subtle: { color: '#24292F1A', x: 0, y: 0, blur: 4 }
} as const

const SurfaceShadowComponentNames = [
  'editor-api-reference-code-panel',
  'Notification/Toast/Success',
  'Notification/Toast/Info',
  'Notification/Toast/Warning',
  'Notification/Toast/Error',
  'Message/Status/Saving',
  'Message/Status/Error',
  'Message/Status/Info',
  'Message/Status/Warning',
  'Message/Status/Success',
  'Message/Status/LongInfo',
  'Expand list',
  'list/expand-list'
] as const
const UiTextAssetExtensions = new Set(['.pen', '.json', '.html', '.md'])
const LegacyFontMarkers = ['Alibaba Health Font 2.0 CN', 'AlibabaHealthFont2.0CN-85B.ttf', 'Source Han Sans SC VF']
const PagePenSpecs = [
  { name: 'community-explore.pen', path: CommunityExplorePath, alias: '2' },
  { name: 'community-home.pen', path: CommunityHomePath, alias: 'r' },
  { name: 'community-login.pen', path: CommunityLoginPath, alias: 'r' },
  { name: 'community-project.pen', path: CommunityProjectPath, alias: 'm' },
  { name: 'community-search.pen', path: CommunitySearchPath, alias: 't' },
  { name: 'community-user.pen', path: CommunityUserPath, alias: 'j' },
  { name: 'editor-map.pen', path: EditorMapPath, alias: 'y' },
  { name: 'editor-sprite.pen', path: EditorSpritePath, alias: 'a' },
  { name: 'editor-stage.pen', path: EditorStagePath, alias: 'G' },
  { name: 'tutorial.pen', path: TutorialPath, alias: 'P' }
] as const

function readPen(path: string): PenNode {
  return JSON.parse(readFileSync(path, 'utf8')) as PenNode
}

function readPenText(path: string) {
  return readFileSync(path, 'utf8')
}

function collectUiTextAssetPaths(path: string, files: string[] = []) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === '.DS_Store' || entry.name === '.snapshots' || entry.name === 'images') continue

    const entryPath = resolve(path, entry.name)
    if (entry.isDirectory()) {
      collectUiTextAssetPaths(entryPath, files)
      continue
    }

    if (UiTextAssetExtensions.has(extname(entry.name))) files.push(entryPath)
  }

  return files
}

function collectLegacyFontMarkers(path: string) {
  const text = readPenText(path)
  return LegacyFontMarkers.filter((marker) => text.includes(marker))
}

function readColorPalette<const TSteps extends readonly number[]>(path: string, prefix: string, steps: TSteps) {
  const pen = readPen(path) as PenDocument

  return Object.fromEntries(steps.map((step) => [step, readDefaultColorVariable(pen, `${prefix}${step}`)])) as Record<
    TSteps[number],
    string
  >
}

function readRadiusScale(path: string) {
  const pen = readPen(path) as PenDocument

  return {
    ...Object.fromEntries(RadiusSteps.map((step) => [step, readDefaultNumberVariable(pen, `radius-${step}`)])),
    full: readDefaultNumberVariable(pen, 'radius-full')
  } as Record<(typeof RadiusSteps)[number], number> & { full: number }
}

function readSpaceScale(path: string) {
  const pen = readPen(path) as PenDocument

  return Object.fromEntries(
    SpaceSteps.map((step) => [step, readDefaultNumberVariable(pen, `space-${step}`)])
  ) as Record<(typeof SpaceSteps)[number], number>
}

function readShadowScale(path: string) {
  const pen = readPen(path) as PenDocument

  return {
    panel: readDefaultStringVariable(pen, 'shadow-panel'),
    surface: readDefaultStringVariable(pen, 'shadow-surface'),
    surfaceStrong: readDefaultStringVariable(pen, 'shadow-surface-strong'),
    accent: readDefaultStringVariable(pen, 'shadow-accent'),
    subtle: readDefaultStringVariable(pen, 'shadow-subtle')
  } as const
}

function readCodeBoxShadowScale() {
  const shadows = boxShadow as Record<string, string | undefined>

  return {
    panel: shadows.panel ?? shadows.md,
    surface: shadows.surface ?? shadows.sm,
    surfaceStrong: shadows.surfaceStrong ?? shadows.lg,
    accent: shadows.accent ?? shadows.brand
  }
}

function readTextLineHeightScale(path: string) {
  const pen = readPen(path) as PenDocument

  return Object.fromEntries(
    LineHeightSteps.map((step) => [step, readDefaultNumberVariable(pen, `line-height-${step}`)])
  ) as Record<(typeof LineHeightSteps)[number], number>
}

function readMaskScale(path: string) {
  const pen = readPen(path) as PenDocument

  return Object.fromEntries(MaskSteps.map((step) => [step, readDefaultColorVariable(pen, `mask-${step}`)])) as Record<
    (typeof MaskSteps)[number],
    string
  >
}

function readVariableEntries(pen: PenDocument, variableName: string) {
  return pen.variables?.[variableName]?.value ?? []
}

function readShadowEffectPreset(path: string, preset: keyof typeof ExpectedPenShadowEffectPresets) {
  const pen = readPen(path) as PenDocument
  const variablePrefix = {
    panel: 'shadow-panel',
    surface: 'shadow-surface',
    surfaceStrong: 'shadow-surface-strong',
    accent: 'shadow-accent',
    subtle: 'shadow-subtle'
  }[preset]

  return {
    color: readDefaultColorVariable(pen, `${variablePrefix}-color`),
    x: readDefaultNumberVariable(pen, `${variablePrefix}-offset-x`),
    y: readDefaultNumberVariable(pen, `${variablePrefix}-offset-y`),
    blur: readDefaultNumberVariable(pen, `${variablePrefix}-blur`),
    ...(preset === 'surfaceStrong' ? { spread: readDefaultNumberVariable(pen, `${variablePrefix}-spread`) } : {})
  }
}

function readPenBundle(path: string, seen = new Set<string>()): PenDocument[] {
  const resolvedPath = resolve(path)
  if (seen.has(resolvedPath)) return []

  seen.add(resolvedPath)
  const pen = readPen(resolvedPath) as PenDocument
  const importedPens: PenDocument[] =
    pen.imports == null
      ? []
      : Object.values(pen.imports).flatMap((importPath): PenDocument[] =>
          readPenBundle(resolve(dirname(resolvedPath), importPath), seen)
        )

  return [pen, ...importedPens]
}

function findNodesByName(node: PenNode | PenDocument, name: string, acc: PenNode[] = []) {
  if ('name' in node && node.name === name) acc.push(node)
  if (!('children' in node) || node.children == null) return acc

  for (const child of node.children) findNodesByName(child, name, acc)
  return acc
}

function readDefaultColorVariable(pen: PenDocument, variableName: string) {
  const entries = pen.variables?.[variableName]?.value ?? []
  const defaultEntry = entries.find((entry) => {
    if (entry.theme == null) return true
    return Object.values(entry.theme).every((value) => value === 'Default')
  })

  if (typeof defaultEntry?.value !== 'string') throw new Error(`Missing default color variable ${variableName}`)
  return defaultEntry.value.toUpperCase()
}

function readDefaultNumberVariable(pen: PenDocument, variableName: string) {
  const entries = pen.variables?.[variableName]?.value ?? []
  const defaultEntry = entries.find((entry) => {
    if (entry.theme == null) return true
    return Object.values(entry.theme).every((value) => value === 'Default')
  })

  if (typeof defaultEntry?.value !== 'number') throw new Error(`Missing default number variable ${variableName}`)
  return defaultEntry.value
}

function readDefaultStringVariable(pen: PenDocument, variableName: string) {
  const entries = pen.variables?.[variableName]?.value ?? []
  const defaultEntry = entries.find((entry) => {
    if (entry.theme == null) return true
    return Object.values(entry.theme).every((value) => value === 'Default')
  })

  if (typeof defaultEntry?.value !== 'string') throw new Error(`Missing default string variable ${variableName}`)
  return defaultEntry.value
}

function collectNodesById(node: unknown, nodes = new Map<string, PenNode>()) {
  if (Array.isArray(node)) {
    for (const item of node) collectNodesById(item, nodes)
    return nodes
  }
  if (node == null || typeof node !== 'object') return nodes

  const penNode = node as PenNode
  if (penNode.id != null) nodes.set(penNode.id, penNode)

  for (const value of Object.values(penNode)) collectNodesById(value, nodes)
  return nodes
}

function collectNullLayoutFields(node: unknown, issues: string[] = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectNullLayoutFields(item, issues)
    return issues
  }
  if (node == null || typeof node !== 'object') return issues

  const penNode = node as PenNode
  for (const field of ['width', 'height', 'x', 'y'] as const) {
    if (field in penNode && penNode[field] === null) {
      const label = [penNode.id ?? '<no-id>', penNode.name].filter((value) => value != null).join(' ')
      issues.push(`${label} ${field}`)
    }
  }

  for (const value of Object.values(penNode)) collectNullLayoutFields(value, issues)
  return issues
}

function collectNodesByNamePrefix(node: unknown, prefix: string, nodes: PenNode[] = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectNodesByNamePrefix(item, prefix, nodes)
    return nodes
  }
  if (node == null || typeof node !== 'object') return nodes

  const penNode = node as PenNode
  if (typeof penNode.name === 'string' && penNode.name.startsWith(prefix)) nodes.push(penNode)

  for (const value of Object.values(penNode)) collectNodesByNamePrefix(value, prefix, nodes)
  return nodes
}

function collectNodeNames(node: unknown, names: string[] = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectNodeNames(item, names)
    return names
  }
  if (node == null || typeof node !== 'object') return names

  const penNode = node as PenNode
  if (typeof penNode.name === 'string') names.push(penNode.name)

  for (const value of Object.values(penNode)) collectNodeNames(value, names)
  return names
}

function collectNodeTypes(node: unknown, nodeTypes = new Map<string, number>()) {
  if (Array.isArray(node)) {
    for (const item of node) collectNodeTypes(item, nodeTypes)
    return nodeTypes
  }
  if (node == null || typeof node !== 'object') return nodeTypes

  const penNode = node as PenNode
  if (typeof penNode.type === 'string') {
    nodeTypes.set(penNode.type, (nodeTypes.get(penNode.type) ?? 0) + 1)
  }

  for (const value of Object.values(penNode)) collectNodeTypes(value, nodeTypes)
  return nodeTypes
}

function isEquivalentMediumButtonHeight(height: unknown) {
  if (typeof height === 'number') return Math.abs(height - 32) < 0.01
  return height === 'fit_content(32)' || height === 'fill_container(32)'
}

function collectImportedRefIds(node: unknown, importAliases: Set<string>, refs = new Set<string>()) {
  if (Array.isArray(node)) {
    for (const item of node) collectImportedRefIds(item, importAliases, refs)
    return refs
  }
  if (node == null || typeof node !== 'object') return refs

  const penNode = node as PenNode
  if (typeof penNode.ref === 'string') {
    const [alias, id] = penNode.ref.split(':')
    if (id != null && importAliases.has(alias)) refs.add(id)
  }

  for (const value of Object.values(penNode)) collectImportedRefIds(value, importAliases, refs)
  return refs
}

function collectAliasedRefValues(node: unknown, refs = new Set<string>()) {
  if (Array.isArray(node)) {
    for (const item of node) collectAliasedRefValues(item, refs)
    return [...refs].sort()
  }
  if (node == null || typeof node !== 'object') return [...refs].sort()

  const penNode = node as PenNode
  if (typeof penNode.ref === 'string' && /^[A-Za-z0-9_-]+:/.test(penNode.ref)) {
    refs.add(penNode.ref)
  }

  for (const value of Object.values(penNode)) collectAliasedRefValues(value, refs)
  return [...refs].sort()
}

function collectTokenizableLiteralIssues(path: string) {
  const lines = readPenText(path).split('\n')
  const issues: string[] = []
  let inPaddingArray = false

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1

    if (/"cornerRadius": (4|8|10|12|20|100|999|100\.00003814697266),?$/.test(line)) {
      issues.push(`line ${lineNumber}: ${line.trim()}`)
    }
    if (/"gap": (4|8|12|16|20|24),?$/.test(line)) {
      issues.push(`line ${lineNumber}: ${line.trim()}`)
    }
    if (/"padding": (4|8|12|16|20|24),?$/.test(line)) {
      issues.push(`line ${lineNumber}: ${line.trim()}`)
    }

    if (/"padding": \[$/.test(line)) {
      inPaddingArray = true
      continue
    }

    if (inPaddingArray) {
      if (/^\s*\],?$/.test(line)) {
        inPaddingArray = false
        continue
      }
      if (/^\s*(4|8|12|16|20|24),?$/.test(line)) {
        issues.push(`line ${lineNumber}: ${line.trim()}`)
      }
    }
  }

  return issues
}

function collectAliasedTokenReferences(node: unknown, refs = new Set<string>()) {
  if (Array.isArray(node)) {
    for (const item of node) collectAliasedTokenReferences(item, refs)
    return [...refs].sort()
  }
  if (typeof node === 'string') {
    if (/^\$[A-Za-z0-9_-]+:/.test(node)) refs.add(node)
    return [...refs].sort()
  }
  if (node == null || typeof node !== 'object') return [...refs].sort()

  for (const value of Object.values(node)) collectAliasedTokenReferences(value, refs)
  return [...refs].sort()
}

function collectUnscopedTokenReferences(text: string) {
  return [
    ...text.matchAll(
      /"\$(grey|turquoise|blue|red|yellow|green|purple|space-|border-radius-|radius-|shadow-|line-height-|mask(?:-[12])?)[^"]*"/g
    )
  ].map((match) => match[0])
}

function isLiteralShadowFieldValue(value: unknown) {
  return typeof value === 'number' || (typeof value === 'string' && value.startsWith('#'))
}

function collectLiteralShadowEffects(node: unknown, trail: string[] = [], issues: string[] = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectLiteralShadowEffects(item, trail, issues)
    return issues
  }
  if (node == null || typeof node !== 'object') return issues

  const penNode = node as PenNode
  const label = [penNode.name, penNode.id].find((value) => typeof value === 'string')
  const nextTrail = label == null ? trail : [...trail, label]
  const effect = penNode.effect as Record<string, unknown> | undefined

  if (effect != null && !Array.isArray(effect) && effect.type === 'shadow') {
    const literalFields: string[] = []

    if (isLiteralShadowFieldValue(effect.color)) literalFields.push(`color=${String(effect.color)}`)
    if (isLiteralShadowFieldValue(effect.blur)) literalFields.push(`blur=${String(effect.blur)}`)
    if (isLiteralShadowFieldValue(effect.spread)) literalFields.push(`spread=${String(effect.spread)}`)
    if (effect.offset != null && typeof effect.offset === 'object' && !Array.isArray(effect.offset)) {
      const offset = effect.offset as Record<string, unknown>
      if (isLiteralShadowFieldValue(offset.x)) literalFields.push(`offset.x=${String(offset.x)}`)
      if (isLiteralShadowFieldValue(offset.y)) literalFields.push(`offset.y=${String(offset.y)}`)
    }

    if (literalFields.length > 0) issues.push(`${nextTrail.join(' > ')} :: ${literalFields.join(', ')}`)
  }

  for (const value of Object.values(penNode)) {
    if (value === effect) continue
    collectLiteralShadowEffects(value, nextTrail, issues)
  }
  return issues
}

function isDesignIllustrationNode(node: PenNode) {
  return (
    typeof node.name === 'string' &&
    (node.name.startsWith('Illustration/') || node.name.startsWith('IllustrationIcon/') || node.name === 'IllustrationElement')
  )
}

function collectHardcodedColorIssues(node: unknown, trail: string[] = [], issues: string[] = []) {
  if (Array.isArray(node)) {
    for (const [index, item] of node.entries()) collectHardcodedColorIssues(item, [...trail, `[${index}]`], issues)
    return issues
  }
  if (typeof node === 'string') {
    if (/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(node)) issues.push(`${trail.join('.')}=${node}`)
    return issues
  }
  if (node == null || typeof node !== 'object') return issues

  if (isDesignIllustrationNode(node as PenNode)) return issues

  for (const [key, value] of Object.entries(node)) collectHardcodedColorIssues(value, [...trail, key], issues)
  return issues
}

function collectGeneratedLiteralColorRefsInIllustrations(node: unknown, inIllustration = false, refs: string[] = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectGeneratedLiteralColorRefsInIllustrations(item, inIllustration, refs)
    return refs
  }
  if (typeof node === 'string') {
    if (inIllustration && /^\$literal-color-[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(node)) refs.push(node)
    return refs
  }
  if (node == null || typeof node !== 'object') return refs

  const nextInIllustration = inIllustration || isDesignIllustrationNode(node as PenNode)
  for (const value of Object.values(node)) collectGeneratedLiteralColorRefsInIllustrations(value, nextInIllustration, refs)
  return refs
}

function getExactColorLiteral(color: string) {
  return color.toLowerCase()
}

function collectHardcodedRefsForColors(node: unknown, colors: readonly string[], refs: string[] = []) {
  const targetColors = new Set(colors.map(getExactColorLiteral))

  function collect(value: unknown, trail: string[] = []) {
    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) collect(item, [...trail, `[${index}]`])
      return
    }
    if (typeof value === 'string') {
      if (targetColors.has(value.toLowerCase())) refs.push(`${trail.join('.')}=${value}`)
      return
    }
    if (value == null || typeof value !== 'object') return

    for (const [key, child] of Object.entries(value)) collect(child, [...trail, key])
  }

  collect(node)
  return refs
}

function collectGeneratedLiteralColorRefsForColors(node: unknown, colors: readonly string[], refs: string[] = []) {
  const targetRefs = new Set(colors.map((color) => `$literal-color-${getExactColorLiteral(color).slice(1)}`))

  function collect(value: unknown) {
    if (Array.isArray(value)) {
      for (const item of value) collect(item)
      return
    }
    if (typeof value === 'string') {
      if (targetRefs.has(value.toLowerCase())) refs.push(value)
      return
    }
    if (value == null || typeof value !== 'object') return

    for (const child of Object.values(value)) collect(child)
  }

  collect(node)
  return refs
}

function collectTokenReferenceCounts(node: unknown, refs = new Map<string, number>()) {
  if (Array.isArray(node)) {
    for (const item of node) collectTokenReferenceCounts(item, refs)
    return refs
  }
  if (typeof node === 'string') {
    if (node.startsWith('$')) refs.set(node.slice(1), (refs.get(node.slice(1)) ?? 0) + 1)
    return refs
  }
  if (node == null || typeof node !== 'object') return refs

  for (const value of Object.values(node)) collectTokenReferenceCounts(value, refs)
  return refs
}

describe('builder-component.lib.pen', () => {
  it('resolves imported pen libraries declared by builder-component.lib.pen', () => {
    const library = readPen(LibraryPath)
    const importedPenPaths = library.imports == null ? [] : Object.values(library.imports)

    expect(importedPenPaths).toEqual([])
    expect(readPenBundle(LibraryPath)).toHaveLength(1)
  })

  it('does not use aliased ref values such as r:... or t:...', () => {
    const library = readPen(LibraryPath)

    expect(collectAliasedRefValues(library)).toEqual([])
  })

  it('does not use page-level aliased token references such as $r:... or $t:...', () => {
    const library = readPen(LibraryPath)

    expect(collectAliasedTokenReferences(library)).toEqual([])
  })

  it('keeps every Button/Medium/... asset with an explicit height aligned to 32px', () => {
    const libraryBundle = readPenBundle(LibraryPath)
    const mediumButtons = collectNodesByNamePrefix(libraryBundle, 'Button/Medium/').filter(
      (node) => node.reusable === true && Object.prototype.hasOwnProperty.call(node, 'height')
    )
    const invalidHeights = mediumButtons
      .filter((node) => !isEquivalentMediumButtonHeight(node.height))
      .map((node) => `${node.id ?? '<no-id>'} ${node.name}=${String(node.height)}`)

    expect(mediumButtons.length).toBeGreaterThan(0)
    expect(invalidHeights).toEqual([])
  })

  it('keeps community explore free of legacy builder-component refs', () => {
    const communityExplore = readPen(CommunityExplorePath) as PenDocument
    const libraryImportAliases = new Set(
      Object.entries(communityExplore.imports ?? {})
        .filter(([, importPath]) => resolve(dirname(CommunityExplorePath), importPath) === LibraryPath)
        .map(([alias]) => alias)
    )
    const importedRefIds = [...collectImportedRefIds(communityExplore, libraryImportAliases)]
    const legacyRefs = importedRefIds.filter((refId) => LegacyCommunityExploreLibraryRefIds.includes(refId))

    expect(legacyRefs).toEqual([])
  })

  it('keeps community explore builder-component refs resolvable', () => {
    const communityExplore = readPen(CommunityExplorePath) as PenDocument
    const libraryImportAliases = new Set(
      Object.entries(communityExplore.imports ?? {})
        .filter(([, importPath]) => resolve(dirname(CommunityExplorePath), importPath) === LibraryPath)
        .map(([alias]) => alias)
    )
    const importedRefIds = [...collectImportedRefIds(communityExplore, libraryImportAliases)]

    const libraryBundle = readPenBundle(LibraryPath)
    const nodesById = collectNodesById(libraryBundle)
    const missingRefs = importedRefIds.filter((refId) => !nodesById.has(refId))

    expect(importedRefIds.length).toBeGreaterThan(0)
    expect(missingRefs).toEqual([])
  })

  it('does not store null layout values that break the pen loader', () => {
    const libraryBundle = readPenBundle(LibraryPath)

    expect(collectNullLayoutFields(libraryBundle)).toEqual([])
  })

  it('keeps turquoise palette synchronized across pen libraries and UI tokens', () => {
    expect(readColorPalette(LibraryPath, 'turquoise', TurquoiseSteps)).toEqual(ExpectedTurquoisePalette)
    expect(
      Object.fromEntries(TurquoiseSteps.map((step) => [step, turquoise[step].toUpperCase()])) as Record<
        (typeof TurquoiseSteps)[number],
        string
      >
    ).toEqual(ExpectedTurquoisePalette)
    expect(turquoise.main.toUpperCase()).toBe(ExpectedTurquoisePalette[500])
  })

  it('keeps yellow palette synchronized across pen libraries and UI tokens', () => {
    expect(readColorPalette(LibraryPath, 'yellow', YellowSteps)).toEqual(ExpectedYellowPalette)
    expect(
      Object.fromEntries(YellowSteps.map((step) => [step, yellow[step].toUpperCase()])) as Record<
        (typeof YellowSteps)[number],
        string
      >
    ).toEqual(ExpectedYellowPalette)
    expect(yellow.main.toUpperCase()).toBe(ExpectedYellowPalette[500])
  })

  it('keeps purple palette synchronized across pen libraries and UI tokens', () => {
    expect(readColorPalette(LibraryPath, 'purple', LibraryPurpleSteps)).toEqual(
      Object.fromEntries(LibraryPurpleSteps.map((step) => [step, ExpectedPurplePalette[step]]))
    )
    expect(
      Object.fromEntries(PurpleSteps.map((step) => [step, purple[step].toUpperCase()])) as Record<
        (typeof PurpleSteps)[number],
        string
      >
    ).toEqual(ExpectedPurplePalette)
    expect(purple.main.toUpperCase()).toBe(ExpectedPurplePalette[500])
  })

  it('keeps blue palette synchronized across pen libraries and UI tokens', () => {
    expect(readColorPalette(LibraryPath, 'blue', BlueSteps)).toEqual(ExpectedBluePalette)
    expect(
      Object.fromEntries(BlueSteps.map((step) => [step, blue[step].toUpperCase()])) as Record<
        (typeof BlueSteps)[number],
        string
      >
    ).toEqual(ExpectedBluePalette)
    expect(blue.main.toUpperCase()).toBe(ExpectedBluePalette[500])
  })

  it('keeps red palette synchronized across pen libraries and UI tokens', () => {
    expect(readColorPalette(LibraryPath, 'red', RedSteps)).toEqual(ExpectedRedPalette)
    expect(
      Object.fromEntries(RedSteps.map((step) => [step, red[step].toUpperCase()])) as Record<
        (typeof RedSteps)[number],
        string
      >
    ).toEqual(ExpectedRedPalette)
    expect(red.main.toUpperCase()).toBe(ExpectedRedPalette[500])
  })

  it('keeps green palette synchronized across pen libraries and UI tokens', () => {
    expect(readColorPalette(LibraryPath, 'green', LibraryGreenSteps)).toEqual(
      Object.fromEntries(LibraryGreenSteps.map((step) => [step, ExpectedGreenPalette[step]]))
    )
    expect(
      Object.fromEntries(GreenSteps.map((step) => [step, green[step].toUpperCase()])) as Record<
        (typeof GreenSteps)[number],
        string
      >
    ).toEqual(ExpectedGreenPalette)
    expect(green.main.toUpperCase()).toBe(ExpectedGreenPalette[500])
  })

  it('keeps grey palette synchronized across pen libraries and UI tokens', () => {
    expect(readColorPalette(LibraryPath, 'grey', GreySteps)).toEqual(ExpectedGreyPalette)
    expect(
      Object.fromEntries(GreySteps.map((step) => [step, grey[step].toUpperCase()])) as Record<
        (typeof GreySteps)[number],
        string
      >
    ).toEqual(ExpectedGreyPalette)
  })

  it('defines code theme color variables inside builder-component.lib.pen', () => {
    const pen = readPen(LibraryPath) as PenDocument

    expect(
      Object.fromEntries(CodeThemeNames.map((name) => [name, readDefaultColorVariable(pen, `code-${name}`)]))
    ).toEqual(ExpectedCodeThemePalette)
  })

  it('keeps radius tokens synchronized across pen libraries and UI tokens', () => {
    expect(readRadiusScale(LibraryPath)).toEqual(ExpectedRadiusScale)
    expect(
      Object.fromEntries(RadiusSteps.map((step) => [step, Number.parseInt(radius[step], 10)])) as Record<
        (typeof RadiusSteps)[number],
        number
      >
    ).toEqual(
      Object.fromEntries(RadiusSteps.map((step) => [step, ExpectedRadiusScale[step]])) as Record<
        (typeof RadiusSteps)[number],
        number
      >
    )
    expect(Number.parseInt(radius.full, 10)).toBe(ExpectedRadiusScale.full)
  })

  it('keeps spacing tokens synchronized across pen libraries and UI tokens', () => {
    expect(readSpaceScale(LibraryPath)).toEqual(ExpectedSpaceScale)
    expect({
      1: Number.parseInt(spacing.sm, 10),
      2: Number.parseInt(spacing.md, 10),
      3: Number.parseInt(spacing.lg, 10),
      4: Number.parseInt(spacing.xl, 10)
    }).toEqual({
      1: ExpectedSpaceScale[1],
      2: ExpectedSpaceScale[2],
      3: ExpectedSpaceScale[3],
      4: ExpectedSpaceScale[4]
    })
  })

  it('keeps shadow tokens synchronized across pen libraries and UI tokens', () => {
    expect(readShadowScale(LibraryPath)).toEqual(ExpectedBoxShadowScale)
    expect(readCodeBoxShadowScale()).toEqual(ExpectedCodeBoxShadowScale)

    const penText = readPenText(LibraryPath)
    expect(penText).not.toContain('shadow-surfaceStrong')
    expect(penText).not.toContain('shadow-floating')
    expect(penText).not.toMatch(/"x": "\\$shadow-offset-x-0"/)
    expect(penText).not.toMatch(/"y": "\\$shadow-offset-y-4"/)
    expect(penText).not.toMatch(/"blur": "\\$shadow-blur-10_5"/)
  })

  it('uses the closest named surface shadow preset for former floating shadow components', () => {
    const pen = readPen(LibraryPath) as PenDocument

    for (const name of SurfaceShadowComponentNames) {
      const nodes = findNodesByName(pen, name)
      expect(nodes.length, `Missing component ${name}`).toBeGreaterThan(0)
      for (const node of nodes) {
        expect(node.effect).toEqual({
          type: 'shadow',
          shadowType: 'outer',
          color: '$shadow-surface-color',
          offset: {
            x: '$shadow-surface-offset-x',
            y: '$shadow-surface-offset-y'
          },
          blur: '$shadow-surface-blur'
        })
      }
    }
  })

  it('keeps text line-height tokens synchronized across pen libraries and UI tokens', () => {
    expect(readTextLineHeightScale(LibraryPath)).toEqual(ExpectedTextLineHeightScale)
  })

  it('keeps mask tokens defined inside builder-component.lib.pen', () => {
    const pen = readPen(LibraryPath) as PenDocument

    expect(readMaskScale(LibraryPath)).toEqual(ExpectedMaskScale)
    expect(readDefaultColorVariable(pen, 'mask')).toBe(ExpectedMaskScale[2])
  })

  it('keeps border-radius-1 free of accent-specific overrides', () => {
    const pen = readPen(LibraryPath) as PenDocument
    const entries = readVariableEntries(pen, 'border-radius-1')

    expect(entries).toHaveLength(1)
    expect(entries[0]?.theme == null || Object.values(entries[0].theme).every((value) => value === 'Default')).toBe(
      true
    )
    expect(entries[0]?.value).toBe(8)
  })

  it('removes legacy custom shadow variable names from builder-component.lib.pen', () => {
    const text = readPenText(LibraryPath)

    expect(text).not.toContain('shadow-custom-01')
    expect(text).not.toContain('shadow-custom-02')
    expect(text).not.toContain('shadow-custom-03')
    expect(text).not.toContain('Panel-small-Grey 1000，8%')
    expect(text).not.toContain('Panel-small-Turquoise 300，65%')
    expect(text).not.toContain('Panel-small-Grey 1000，5%')
    expect(text).not.toContain('Panel-large-Grey1000，14%')
    expect(text).not.toContain('Panel-large-40BAC4，18%')
    expect(text).not.toContain('Card-small-Grey 1000，8%')
  })

  it('does not keep literal color or metric values inside shadow effects', () => {
    expect(collectLiteralShadowEffects(readPen(LibraryPath))).toEqual([])
  })

  it('removes hardcoded legacy turquoise literals from pen component libraries', () => {
    expect(readPenText(LibraryPath)).not.toMatch(/#0bc0cf(?:ff)?/i)
  })

  it('keeps design illustration colors as literal values instead of generated variables', () => {
    const pen = readPen(LibraryPath) as PenDocument

    expect(collectGeneratedLiteralColorRefsInIllustrations(pen.children)).toEqual([])
  })

  it('migrates tokenizable radius and spacing literals to pen tokens', () => {
    expect(collectTokenizableLiteralIssues(LibraryPath)).toEqual([])
  })

  it('uses UIButton vocabulary for button assets and button grouping nodes', () => {
    const libraryBundle = readPenBundle(LibraryPath)
    const names = collectNodeNames(libraryBundle)
    const legacyNames = names.filter(
      (name) =>
        /^Button\/(?:Small|Medium|Large)\/(?:Neutral|Red)\//.test(name) ||
        /^Button\/(?:Small|Medium|Large)\/(?:Primary|Secondary|White|Neutral|Red)\/Default\//.test(name) ||
        name === 'Variant-Neutra'
    )

    expect(legacyNames).toEqual([])
  })

  it('uses UITextInput vocabulary for input and search box assets', () => {
    const libraryBundle = readPenBundle(LibraryPath)
    const names = collectNodeNames(libraryBundle)
    const legacyNames = names.filter(
      (name) =>
        /^(?:Input|SearchBox)\/Neutra\//.test(name) ||
        /^(?:Input|SearchBox)\/.*\/Inputing(?:\/|$)/.test(name) ||
        name === 'ProjectName/Inputing'
    )

    expect(legacyNames).toEqual([])
  })

  it('uses UITag vocabulary for tag assets', () => {
    const libraryBundle = readPenBundle(LibraryPath)
    const names = collectNodeNames(libraryBundle)
    const legacyNames = names.filter(
      (name) =>
        /^Tag\/(?:Text|Icon)\/Medium\//.test(name) ||
        /^Tag\/(?:Text|Icon)\/.*\/(?:Grey|Turquoise|Red|Yellow)(?:\/|$)/.test(name) ||
        /^Tag\/(?:Text|Icon)\/.*\/Disable$/.test(name)
    )

    expect(legacyNames).toEqual([])
  })

  it('uses PascalCase GenList vocabulary for generation list assets', () => {
    const libraryBundle = readPenBundle(LibraryPath)
    const names = collectNodeNames(libraryBundle)
    const legacyNames = names.filter((name) => /^genlist-(?:sprite|backdrop)-/.test(name))

    expect(legacyNames).toEqual([])
    expect(names).toEqual(
      expect.arrayContaining([
        'GenList/Sprite/DefaultUserWaitingSystemGeneration',
        'GenList/Sprite/HoverUserWaitingSystemGeneration',
        'GenList/Sprite/SelectedUserWaitingSystemGeneration',
        'GenList/Sprite/DefaultUserWaitingSystemProcessing',
        'GenList/Sprite/HoverUserWaitingSystemProcessing',
        'GenList/Sprite/SelectedUserWaitingSystemProcessing',
        'GenList/Sprite/DefaultSystemWaitingUser',
        'GenList/Sprite/HoverSystemWaitingUser',
        'GenList/Sprite/SelectedSystemWaitingUser',
        'GenList/Backdrop/DefaultUserWaitingSystemGeneration',
        'GenList/Backdrop/HoverUserWaitingSystemGeneration',
        'GenList/Backdrop/SelectedUserWaitingSystemGeneration',
        'GenList/Backdrop/DefaultUserWaitingSystemProcessing',
        'GenList/Backdrop/HoverUserWaitingSystemProcessing',
        'GenList/Backdrop/SelectedUserWaitingSystemProcessing',
        'GenList/Backdrop/DefaultSystemWaitingUser',
        'GenList/Backdrop/HoverSystemWaitingUser',
        'GenList/Backdrop/SelectedSystemWaitingUser'
      ])
    )
  })

  it('uses PascalCase card vocabulary for large add items and state items', () => {
    const libraryBundle = readPenBundle(LibraryPath)
    const names = collectNodeNames(libraryBundle)
    const legacyNames = names.filter((name) =>
      /^card-(?:add-(?:backdrop|sound|sprite)-item-large|state-item-(?:default|die|step))-/.test(name)
    )

    expect(legacyNames).toEqual([])
    expect(names).toEqual(
      expect.arrayContaining([
        'Card/AddBackdropItem/LargeClick',
        'Card/AddBackdropItem/LargeHover',
        'Card/AddBackdropItem/LargeDefault',
        'Card/AddSoundItem/LargeClick',
        'Card/AddSoundItem/LargeHover',
        'Card/AddSoundItem/LargeDefault',
        'Card/AddSpriteItem/LargeClick',
        'Card/AddSpriteItem/LargeHover',
        'Card/AddSpriteItem/LargeDefault',
        'Card/StateItem/DefaultClick',
        'Card/StateItem/DefaultHover',
        'Card/StateItem/DefaultDefault',
        'Card/StateItem/DieClick',
        'Card/StateItem/DieHover',
        'Card/StateItem/DieDefault',
        'Card/StateItem/StepClick',
        'Card/StateItem/StepHover',
        'Card/StateItem/StepDefault'
      ])
    )
  })

  it('uses PascalCase CornerMarker vocabulary for corner marker assets', () => {
    const libraryBundle = readPenBundle(LibraryPath)
    const names = collectNodeNames(libraryBundle)
    const legacyNames = names.filter((name) =>
      /^Corner marker\/(?:Library\/Check|Item\/Cancel selection|Gen-sprite item\/More|Project item\/More|Add sprite item\/Check|Backdrop item\/More|Sprite item\/More)\/(?:Default|Hover|Click)$/.test(
        name
      )
    )

    expect(legacyNames).toEqual([])
    expect(names).toEqual(
      expect.arrayContaining([
        'CornerMarker/Library/CheckClick',
        'CornerMarker/Library/CheckHover',
        'CornerMarker/Library/CheckDefault',
        'CornerMarker/Item/CancelSelectionClick',
        'CornerMarker/Item/CancelSelectionHover',
        'CornerMarker/Item/CancelSelectionDefault',
        'CornerMarker/GenSpriteItem/MoreClick',
        'CornerMarker/GenSpriteItem/MoreHover',
        'CornerMarker/GenSpriteItem/MoreDefault',
        'CornerMarker/ProjectItem/MoreClick',
        'CornerMarker/ProjectItem/MoreHover',
        'CornerMarker/ProjectItem/MoreDefault',
        'CornerMarker/AddSpriteItem/CheckClick',
        'CornerMarker/AddSpriteItem/CheckHover',
        'CornerMarker/AddSpriteItem/CheckDefault',
        'CornerMarker/BackdropItem/MoreClick',
        'CornerMarker/BackdropItem/MoreDefault',
        'CornerMarker/BackdropItem/MoreHover',
        'CornerMarker/SpriteItem/MoreDefault',
        'CornerMarker/SpriteItem/MoreHover',
        'CornerMarker/SpriteItem/MoreClick'
      ])
    )
  })

  it('loads refreshed XBuilder icon font assets', () => {
    const pen = readPen(LibraryPath) as PenDocument
    const text = readPenText(LibraryPath)
    const iconFonts = new Map(pen.fonts?.map((font) => [font.name, font.url]))

    expect(iconFonts.get('XBuilder_NewIcons_01')).toBe('../../images/xbuilder-newicons-01.ttf')
    expect(iconFonts.get('XBuilder_NewIcons_02')).toBe('../../images/xbuilder-newicons-02.ttf')
    expect(text).not.toContain('"url": "../../images/xbuilder-icons-01.ttf"')
    expect(text).not.toContain('"url": "../../images/xbuilder-icons-02.ttf"')
  })

  it('keeps typography aligned to UI code vocabulary and font baseline', () => {
    const text = readPenText(LibraryPath)

    expect(text).toContain('SourceHanSansSC-VF')
    expect(text).not.toContain('Alibaba Health Font 2.0 CN')
    expect(text).not.toContain('AlibabaHealthFont2.0CN-85B.ttf')
    expect(text).not.toContain('Source Han Sans SC VF')
    expect(text).not.toContain('"name": "H7"')
    expect(text).not.toContain('"content": "H7"')
    expect(text).not.toContain('* H1-H7')
  })

  it('removes legacy Alibaba font references from ui text assets', () => {
    const legacyFontReferences = collectUiTextAssetPaths(UIRootPath).flatMap((path) => {
      const markers = collectLegacyFontMarkers(path)
      if (markers.length === 0) return []
      return [`${path}: ${markers.join(', ')}`]
    })

    expect(legacyFontReferences).toEqual([])
  })

  it('removes legacy m: token namespace from builder-component.lib.pen', () => {
    const text = readPenText(LibraryPath)

    expect(text).not.toContain('$m:')
    expect(text).not.toContain('"m:Accent"')
    expect(text).not.toContain('"m:grey1000"')
  })
})

describe('page pens importing builder-component.lib.pen', () => {
  it.each(PagePenSpecs)('keeps $name free of local token and font definitions', ({ path, alias }) => {
    const pen = readPen(path) as PenDocument
    const text = readPenText(path)

    expect(pen.imports).toBeDefined()
    expect(Object.keys(pen.imports ?? {})).toContain(alias)
    expect(pen.themes ?? {}).toEqual({})
    expect(pen.variables).toBeUndefined()
    expect(pen.fonts).toBeUndefined()
    expect(collectUnscopedTokenReferences(text)).toEqual([])
  })

  it.each(PagePenSpecs)('keeps $name free of copied local text and path assets', ({ path }) => {
    const nodeTypes = collectNodeTypes(readPen(path))

    expect(nodeTypes.get('text') ?? 0).toBe(0)
    expect(nodeTypes.get('path') ?? 0).toBe(0)
  })
})
