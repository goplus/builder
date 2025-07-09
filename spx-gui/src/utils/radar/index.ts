import { nanoid } from 'nanoid'
import { inject, reactive, type App, type Directive, type InjectionKey } from 'vue'

export type RadarNodeMeta = {
  /** Descriptive name of the node */
  name: string
  /** Desciption of the node */
  desc: string
  /** Whether the node is visible */
  visible?: boolean
}

export type RadarNodeDirectiveValue = RadarNodeMeta

export type RadarNodeDirective = Directive<HTMLElement, RadarNodeDirectiveValue>

declare module '@vue/runtime-core' {
  interface GlobalDirectives {
    vRadar: RadarNodeDirective
  }
}

export class RadarNodeInfo {
  /** Unique identifier for the node */
  id: string
  /** Descriptive name of the node */
  name: string
  /** Desciption of the node */
  desc: string
  /** Whether the node is visible */
  visible: boolean

  private element: HTMLElement
  private children: RadarNodeInfo[] = []

  constructor(element: HTMLElement, { name, desc, visible }: RadarNodeMeta) {
    this.id = nanoid(8)
    this.name = name
    this.desc = desc
    this.visible = visible ?? true
    this.element = element
    return reactive(this) as this
  }

  updateMeta(meta: RadarNodeMeta) {
    this.name = meta.name
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
      name: 'Virtual root',
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
    el.setAttribute('aria-label', node.name)
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
