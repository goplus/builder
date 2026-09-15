import { nanoid } from 'nanoid'
import { inject, reactive, type App, type Directive, type InjectionKey } from 'vue'

const radarNamePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export type RadarNodeAttributeValue = string | null | undefined

export type RadarNodeAttributes = Record<string, RadarNodeAttributeValue>

export type RadarNodeMeta = {
  /** Stable semantic identifier of the node. */
  name: string
  /** Optional accessible-label override. */
  label?: string
  /** Description of the node */
  desc: string
  /** Stable values identifying a concrete node instance. */
  attrs?: RadarNodeAttributes
  /** Whether the node is visible */
  visible?: boolean
}

export type RadarNodeDirectiveValue = RadarNodeMeta

export type RadarNodeDirective = Directive<HTMLElement, RadarNodeDirectiveValue>

type RadarSelectorCompound = {
  name: string
  attrs: Record<string, string>
}

export class RadarSelectorSyntaxError extends SyntaxError {}

function assertRadarName(name: string, kind: 'name' | 'attribute name') {
  if (radarNamePattern.test(name)) return
  throw new Error(`Invalid Radar ${kind}: ${name}`)
}

function humanizeRadarName(name: string) {
  const [firstWord, ...restWords] = name.split('-')
  return `${firstWord[0].toUpperCase()}${firstWord.slice(1)}${restWords.length > 0 ? ` ${restWords.join(' ')}` : ''}`
}

function normalizeAttrs(attrs: RadarNodeAttributes | undefined): Record<string, string> {
  if (attrs == null) return {}
  const normalized: Record<string, string> = {}
  for (const [name, value] of Object.entries(attrs)) {
    if (value == null) continue
    assertRadarName(name, 'attribute name')
    normalized[name] = value
  }
  return normalized
}

function getLabel(meta: RadarNodeMeta, attrs: Record<string, string>) {
  if (meta.label != null) return meta.label
  const label = humanizeRadarName(meta.name)
  if (attrs.name == null) return label
  return `${label} "${attrs.name}"`
}

function parseRadarSelector(selector: string): RadarSelectorCompound[] {
  let index = 0

  function error(message: string): never {
    throw new RadarSelectorSyntaxError(`Invalid Radar selector at ${index}: ${message}`)
  }

  function skipWhitespace() {
    const start = index
    while (/\s/.test(selector[index] ?? '')) index++
    return index > start
  }

  function parseName(kind: 'name' | 'attribute name') {
    const start = index
    while (/[A-Za-z0-9-]/.test(selector[index] ?? '')) index++
    if (start === index) error(`expected ${kind}`)
    const name = selector.slice(start, index)
    if (!radarNamePattern.test(name)) error(`invalid ${kind} ${name}`)
    return name
  }

  function parseString() {
    if (selector[index] !== '"') error('expected JSON string')
    const start = index++
    let escaped = false
    while (index < selector.length) {
      const char = selector[index++]
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') {
        try {
          const value = JSON.parse(selector.slice(start, index))
          if (typeof value !== 'string') error('expected JSON string')
          return value
        } catch {
          error('invalid JSON string')
        }
      }
    }
    error('unterminated JSON string')
  }

  skipWhitespace()
  if (index === selector.length) error('expected selector')

  const result: RadarSelectorCompound[] = []
  while (index < selector.length) {
    const name = parseName('name')
    const attrs: Record<string, string> = {}
    while (selector[index] === '[') {
      index++
      const attrName = parseName('attribute name')
      if (selector[index++] !== '=') error('expected =')
      const value = parseString()
      if (selector[index++] !== ']') error('expected ]')
      attrs[attrName] = value
    }
    result.push({ name, attrs })

    if (index === selector.length) break
    if (!skipWhitespace()) error('expected whitespace')
    if (index === selector.length) break
  }
  return result
}

declare module '@vue/runtime-core' {
  interface GlobalDirectives {
    vRadar: RadarNodeDirective
  }
}

export class RadarNodeInfo {
  /** Unique identifier for the node */
  id: string
  /** Stable semantic identifier of the node */
  name: string
  /** Accessible label of the node */
  label: string
  /** Description of the node */
  desc: string
  /** Stable attributes of the node */
  attrs: Record<string, string>
  /** Whether the node is visible */
  visible: boolean

  private element: HTMLElement
  private children: RadarNodeInfo[] = []

  constructor(element: HTMLElement, meta: RadarNodeMeta) {
    this.id = nanoid(8)
    assertRadarName(meta.name, 'name')
    this.name = meta.name
    this.attrs = normalizeAttrs(meta.attrs)
    this.label = getLabel(meta, this.attrs)
    this.desc = meta.desc
    this.visible = meta.visible ?? true
    this.element = element
    return reactive(this) as this
  }

  updateMeta(meta: RadarNodeMeta) {
    assertRadarName(meta.name, 'name')
    this.name = meta.name
    this.attrs = normalizeAttrs(meta.attrs)
    this.label = getLabel(meta, this.attrs)
    this.desc = meta.desc
    this.visible = meta.visible ?? true
  }

  /** Get the HTML element representing the node */
  getElement(): HTMLElement {
    return this.element
  }

  /** Get the children of the node */
  getChildren(includeInvisible = false): RadarNodeInfo[] {
    if (includeInvisible) return this.children
    return this.children.filter((child) => child.visible)
  }

  setChildren(children: RadarNodeInfo[]) {
    this.children = children
  }

  addChild(child: RadarNodeInfo) {
    if (this.children.includes(child)) return
    this.children.push(child)
  }

  removeChild(child: RadarNodeInfo) {
    const index = this.children.indexOf(child)
    if (index < 0) return
    this.children.splice(index, 1)
  }
}

export class Radar {
  private rootNode: RadarNodeInfo
  private elNodeMap = new WeakMap<HTMLElement, RadarNodeInfo>()
  private idNodeMap = new Map<string, RadarNodeInfo>()

  constructor() {
    this.rootNode = new RadarNodeInfo(document.body, {
      name: 'virtual-root',
      label: 'Virtual root',
      desc: 'Virtual node as root of the UI tree'
    })
    this.elNodeMap.set(document.body, this.rootNode)
  }

  /** Get the root nodes of the UI tree */
  getRootNodes(): RadarNodeInfo[] {
    return this.rootNode.getChildren()
  }

  /** Get a node by its ID */
  getNodeById(id: string): RadarNodeInfo | null {
    return this.idNodeMap.get(id) ?? null
  }

  /** Select visible nodes matching a Radar selector in document order. */
  selectAll(selector: string): RadarNodeInfo[] {
    const compounds = parseRadarSelector(selector)
    const visibleNodes = this.getVisibleNodes()
    let matches = visibleNodes.filter((node) => this.matchesCompound(node, compounds[0]))
    for (const compound of compounds.slice(1)) {
      const parentMatches = matches
      matches = visibleNodes.filter(
        (node) =>
          this.matchesCompound(node, compound) &&
          parentMatches.some((parent) => parent.getElement().contains(node.getElement()))
      )
    }
    return matches
  }

  private getVisibleNodes(): RadarNodeInfo[] {
    const nodes: RadarNodeInfo[] = []
    const visit = (parent: RadarNodeInfo) => {
      for (const child of parent.getChildren()) {
        nodes.push(child)
        visit(child)
      }
    }
    visit(this.rootNode)
    return nodes.sort((a, b) => {
      const position = a.getElement().compareDocumentPosition(b.getElement())
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
      return 0
    })
  }

  private matchesCompound(node: RadarNodeInfo, compound: RadarSelectorCompound) {
    if (node.name !== compound.name) return false
    return Object.entries(compound.attrs).every(([name, value]) => node.attrs[name] === value)
  }

  /** Find the parent node of a given node in current tree */
  private findParentNode(node: RadarNodeInfo): RadarNodeInfo | null {
    const el = node.getElement()
    let currEl = el.parentElement
    while (currEl != null) {
      const parentNode = this.elNodeMap.get(currEl)
      if (parentNode != null) return parentNode
      currEl = currEl.parentElement
    }
    return null
  }

  /** Update the relationship of a node with its parent and children */
  private updateNodeRelationship(node: RadarNodeInfo) {
    const parent = this.findParentNode(node)
    if (parent == null) return

    const nodeEl = node.getElement()
    const newSiblings: RadarNodeInfo[] = []
    const newChildren: RadarNodeInfo[] = []
    ;[...parent.getChildren(true), ...node.getChildren(true)].forEach((msn) => {
      const msEl = msn.getElement()
      if (msEl === nodeEl) return
      if (nodeEl.contains(msEl)) newChildren.push(msn)
      else newSiblings.push(msn)
    })

    newSiblings.push(node)
    parent.setChildren(newSiblings)
    node.setChildren(newChildren)
  }

  private registerWithEl(el: HTMLElement, meta: RadarNodeMeta) {
    let node = this.elNodeMap.get(el)
    if (node == null) {
      node = new RadarNodeInfo(el, meta)
      this.elNodeMap.set(el, node)
      this.idNodeMap.set(node.id, node)
      this.updateNodeRelationship(node)
    } else {
      node.updateMeta(meta)
    }
    el.setAttribute('aria-label', node.label)
    el.setAttribute('aria-description', node.desc)
    el.setAttribute('aria-hidden', node.visible ? 'false' : 'true')
  }

  private unregisterWithEl(el: HTMLElement) {
    const node = this.elNodeMap.get(el)
    if (node == null) return
    this.elNodeMap.delete(el)
    this.idNodeMap.delete(node.id)
    const parentNode = this.findParentNode(node)
    if (parentNode == null) return
    parentNode.removeChild(node)
  }

  install(app: App<unknown>) {
    app.provide(radarInjectKey, this)

    app.directive('radar', {
      mounted: (el, binding) => this.registerWithEl(el, binding.value),
      updated: (el, binding) => this.registerWithEl(el, binding.value),
      beforeUnmount: (el) => this.unregisterWithEl(el)
    } satisfies RadarNodeDirective)
  }
}

const radarInjectKey: InjectionKey<Radar> = Symbol('radar')

/** Hook to access the Radar instance */
export function useRadar(): Radar {
  const radar = inject(radarInjectKey)
  if (radar == null) throw new Error('Radar instance not found. Make sure to install before using `useRadar()`.')
  return radar
}

export function createRadar() {
  return new Radar()
}
