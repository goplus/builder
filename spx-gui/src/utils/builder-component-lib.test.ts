import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

type PenNode = {
  id?: string
  name?: string
  reusable?: boolean
  slot?: string[]
  children?: PenNode[]
  [key: string]: unknown
}

const LibraryPath = resolve(process.cwd(), '../ui/components/spx/builder-component.lib.pen')
function readPen(path: string): PenNode {
  return JSON.parse(readFileSync(path, 'utf8')) as PenNode
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

function collectNodeNames(node: unknown, names = new Set<string>()) {
  if (Array.isArray(node)) {
    for (const item of node) collectNodeNames(item, names)
    return names
  }
  if (node == null || typeof node !== 'object') return names

  const penNode = node as PenNode
  if (typeof penNode.name === 'string') names.add(penNode.name)

  for (const value of Object.values(penNode)) collectNodeNames(value, names)
  return names
}

function collectDanglingGeneratedSlotIds(
  node: unknown,
  nodeIds: Set<string>,
  nodeNames: Set<string>,
  issues: string[] = []
) {
  if (Array.isArray(node)) {
    for (const item of node) collectDanglingGeneratedSlotIds(item, nodeIds, nodeNames, issues)
    return issues
  }
  if (node == null || typeof node !== 'object') return issues

  const penNode = node as PenNode
  if (Array.isArray(penNode.slot)) {
    for (const slotId of penNode.slot) {
      if (typeof slotId !== 'string') continue
      if (!/^[A-Za-z0-9]{5}$/.test(slotId)) continue
      if (nodeNames.has(slotId)) continue
      if (!nodeIds.has(slotId)) {
        const label = [penNode.id ?? '<no-id>', penNode.name].filter((value) => value != null).join(' ')
        issues.push(`${label} -> ${slotId}`)
      }
    }
  }

  for (const value of Object.values(penNode)) collectDanglingGeneratedSlotIds(value, nodeIds, nodeNames, issues)
  return issues
}

describe('builder-component.lib.pen', () => {
  it('keeps every Button/Medium/... asset at 32px height', () => {
    const library = readPen(LibraryPath)
    const mediumButtons = collectNodesByNamePrefix(library, 'Button/Medium/')
    const invalidHeights = mediumButtons
      .filter((node) => node.height !== 32)
      .map((node) => `${node.id ?? '<no-id>'} ${node.name}=${String(node.height)}`)

    expect(mediumButtons.length).toBeGreaterThan(0)
    expect(invalidHeights).toEqual([])
  })

  it('does not keep dangling generated slot ids', () => {
    const library = readPen(LibraryPath)
    const nodeIds = new Set(collectNodesById(library).keys())
    const nodeNames = collectNodeNames(library)

    expect(collectDanglingGeneratedSlotIds(library, nodeIds, nodeNames)).toEqual([])
  })

  it('keeps the segmented control slots resolvable for community explore', () => {
    const library = readPen(LibraryPath)
    const nodesById = collectNodesById(library)
    const segmentedControl = nodesById.get('le3CV')
    const missingSlots =
      segmentedControl?.slot?.filter((slotId) => !slotId.includes(':') && !nodesById.has(slotId)) ?? []

    expect(segmentedControl, 'le3CV should exist in builder-component.lib.pen').toBeDefined()
    expect(missingSlots, 'le3CV should not reference missing slot ids').toEqual([])
  })

  it('keeps community explore filters bound to the segmented control asset', () => {
    const library = readPen(LibraryPath)
    const nodesById = collectNodesById(library)
    const segmentedControl = nodesById.get('le3CV')

    expect(segmentedControl?.name).toBe('Segmented control')
    expect(segmentedControl?.slot).toEqual(expect.arrayContaining(['BRO5N', 'HuMs3', '3Jeg5', 'dGMX8', 'EO5cL']))
  })

  it('does not store null layout values that break the pen loader', () => {
    const library = readPen(LibraryPath)

    expect(collectNullLayoutFields(library)).toEqual([])
  })
})
