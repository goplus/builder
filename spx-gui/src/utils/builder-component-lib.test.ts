import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

type PenNode = {
  id?: string
  name?: string
  reusable?: boolean
  imports?: Record<string, string>
  slot?: string[]
  children?: PenNode[]
  [key: string]: unknown
}

const LibraryPath = resolve(process.cwd(), '../ui/components/spx/builder-component.lib.pen')
const SegmentedControlId = 'le3CV'
const CommunityExploreSegmentedSlots = ['BRO5N', 'HuMs3', '3Jeg5', 'dGMX8', 'EO5cL']

function readPen(path: string): PenNode {
  return JSON.parse(readFileSync(path, 'utf8')) as PenNode
}

function readPenBundle(path: string, seen = new Set<string>()) {
  const resolvedPath = resolve(path)
  if (seen.has(resolvedPath)) return []

  seen.add(resolvedPath)
  const pen = readPen(resolvedPath)
  const importedPens =
    pen.imports == null
      ? []
      : Object.values(pen.imports).flatMap((importPath) => readPenBundle(resolve(dirname(resolvedPath), importPath), seen))

  return [pen, ...importedPens]
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

describe('builder-component.lib.pen', () => {
  it('resolves imported pen libraries declared by builder-component.lib.pen', () => {
    const library = readPen(LibraryPath)
    const importedPenPaths = library.imports == null ? [] : Object.values(library.imports)

    expect(importedPenPaths).toContain('builder-component2.lib.pen')
    expect(readPenBundle(LibraryPath)).toHaveLength(importedPenPaths.length + 1)
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
})
