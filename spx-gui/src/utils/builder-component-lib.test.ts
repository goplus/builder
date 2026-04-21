import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'
import { turquoise } from '../components/ui/tokens/colors'
import { boxShadow, radius, space } from '../components/ui/tokens'

type PenNode = {
  id?: string
  name?: string
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

type PenDocument = PenNode & {
  variables?: Record<string, PenVariable>
}

const LibraryPath = resolve(process.cwd(), '../ui/components/spx/builder-component.lib.pen')
const ConfigPanelPath = resolve(process.cwd(), 'src/components/editor/common/viewer/quick-config/common/ConfigPanel.vue')
const UIModalPath = resolve(process.cwd(), 'src/components/ui/modal/UIModal.vue')
const UIDropdownPath = resolve(process.cwd(), 'src/components/ui/UIDropdown.ts')
const ProjectItemPath = resolve(process.cwd(), 'src/components/project/ProjectItem.vue')
const SegmentedControlId = 'le3CV'
const CommunityExploreSegmentedSlots = ['BRO5N', 'HuMs3', '3Jeg5', 'dGMX8', 'EO5cL']
const TurquoiseSteps = [100, 200, 300, 400, 500, 600, 700] as const
const RadiusSteps = [1, 2, 3, 4] as const
const SpaceSteps = [1, 2, 3, 4, 5, 6] as const
const ExpectedTurquoisePalette = {
  100: '#F3FBFC',
  200: '#EAF9FA',
  300: '#AFE7EC',
  400: '#3FCDD9',
  500: '#36C2CF',
  600: '#2B9BA5',
  700: '#20747C'
} as const
const ExpectedRadiusScale = {
  1: 4,
  2: 8,
  3: 10,
  4: 12,
  full: 100
} as const
const ExpectedSpaceScale = {
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
  subtle: '2px 2px 3px 0px rgba(36, 41, 47, 0.04)'
} as const

function readPen(path: string): PenNode {
  return JSON.parse(readFileSync(path, 'utf8')) as PenNode
}

function readPenText(path: string) {
  return readFileSync(path, 'utf8')
}

function readTurquoisePalette(path: string) {
  const pen = readPen(path) as PenDocument

  return Object.fromEntries(
    TurquoiseSteps.map((step) => [step, readDefaultColorVariable(pen, `turquoise${step}`)])
  ) as Record<(typeof TurquoiseSteps)[number], string>
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

function isEquivalentMediumButtonHeight(height: unknown) {
  if (typeof height === 'number') return Math.abs(height - 32) < 0.01
  return height === 'fit_content(32)' || height === 'fill_container(32)'
}

function collectTokenizableLiteralIssues(path: string) {
  const lines = readPenText(path).split('\n')
  const issues: string[] = []
  let inPaddingArray = false

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1

    if (/"cornerRadius": (4|8|10|12|100|999|100\.00003814697266),?$/.test(line)) {
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

describe('builder-component.lib.pen', () => {
  it('resolves imported pen libraries declared by builder-component.lib.pen', () => {
    const library = readPen(LibraryPath)
    const importedPenPaths = library.imports == null ? [] : Object.values(library.imports)

    expect(importedPenPaths).toEqual([])
    expect(readPenBundle(LibraryPath)).toHaveLength(1)
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

  it('keeps the segmented control slots resolvable for community explore', () => {
    const libraryBundle = readPenBundle(LibraryPath)
    const nodesById = collectNodesById(libraryBundle)
    const segmentedControl = nodesById.get(SegmentedControlId)
    const missingSlots =
      segmentedControl?.slot?.filter((slotId) => !slotId.includes(':') && !nodesById.has(slotId)) ?? []

    expect(segmentedControl, `${SegmentedControlId} should exist in builder-component.lib.pen`).toBeDefined()
    expect(missingSlots, `${SegmentedControlId} should not reference missing slot ids`).toEqual([])
  })

  it('keeps community explore filters bound to the segmented control asset', () => {
    const libraryBundle = readPenBundle(LibraryPath)
    const nodesById = collectNodesById(libraryBundle)
    const segmentedControl = nodesById.get(SegmentedControlId)

    expect(segmentedControl?.name).toBe('Segmented control')
    expect(segmentedControl?.slot).toEqual(expect.arrayContaining(CommunityExploreSegmentedSlots))
  })

  it('does not store null layout values that break the pen loader', () => {
    const libraryBundle = readPenBundle(LibraryPath)

    expect(collectNullLayoutFields(libraryBundle)).toEqual([])
  })

  it('keeps turquoise palette synchronized across pen libraries and UI tokens', () => {
    expect(readTurquoisePalette(LibraryPath)).toEqual(ExpectedTurquoisePalette)
    expect(
      Object.fromEntries(TurquoiseSteps.map((step) => [step, turquoise[step].toUpperCase()])) as Record<
        (typeof TurquoiseSteps)[number],
        string
      >
    ).toEqual(ExpectedTurquoisePalette)
    expect(turquoise.main.toUpperCase()).toBe(ExpectedTurquoisePalette[500])
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
    expect(
      Object.fromEntries(SpaceSteps.map((step) => [step, Number.parseInt(space[step], 10)])) as Record<
        (typeof SpaceSteps)[number],
        number
      >
    ).toEqual(ExpectedSpaceScale)
  })

  it('keeps shadow tokens synchronized across pen libraries and UI tokens', () => {
    expect(readShadowScale(LibraryPath)).toEqual(ExpectedBoxShadowScale)
    expect({
      panel: boxShadow.panel,
      surface: boxShadow.surface,
      surfaceStrong: boxShadow.surfaceStrong,
      accent: boxShadow.accent,
      subtle: boxShadow.subtle
    }).toEqual(ExpectedBoxShadowScale)
    expect(boxShadow.small).toBe(ExpectedBoxShadowScale.subtle)
    expect(boxShadow.big).toBe(ExpectedBoxShadowScale.surfaceStrong)
    expect(boxShadow.diffusion).toBe(ExpectedBoxShadowScale.accent)
  })

  it('migrates selected component shadows to named elevation tokens', () => {
    expect(readPenText(ConfigPanelPath)).toContain('var(--ui-box-shadow-panel)')
    expect(readPenText(ConfigPanelPath)).not.toContain('var(--ui-box-shadow-big)')

    expect(readPenText(UIModalPath)).toContain('var(--ui-box-shadow-surfaceStrong)')
    expect(readPenText(UIModalPath)).not.toContain('var(--ui-box-shadow-big)')

    expect(readPenText(UIDropdownPath)).toContain('var(--ui-box-shadow-surface)')
    expect(readPenText(UIDropdownPath)).not.toContain('var(--ui-box-shadow-big)')

    expect(readPenText(ProjectItemPath)).toContain('var(--ui-box-shadow-surface)')
    expect(readPenText(ProjectItemPath)).not.toContain('0px 4px 12px 0px rgba(36, 41, 47, 0.08)')
  })

  it('removes hardcoded legacy turquoise literals from pen component libraries', () => {
    expect(readPenText(LibraryPath)).not.toMatch(/#0bc0cf(?:ff)?/i)
  })

  it('migrates tokenizable radius and spacing literals to pen tokens', () => {
    expect(collectTokenizableLiteralIssues(LibraryPath)).toEqual([])
  })
})
