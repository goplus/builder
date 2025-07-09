import { computed, useSlots, type VNode, type VNodeChild } from 'vue'
import { trimLineBreaks as doTrimLineBreaks } from './utils'

export function getTextForVNodeChild(child: VNodeChild): string {
  if (child == null) return ''
  if (typeof child === 'string') return child
  if (Array.isArray(child)) return child.map(getTextForVNodeChild).join('')
  if (typeof child === 'object' && 'children' in child) return getTextForVNode(child)
  console.warn('getTextForVNodeChild: unknown node type', child)
  return ''
}

export function getTextForVNode(vnode: VNode): string {
  const children = vnode.children
  if (children == null) return ''
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(getTextForVNodeChild).join('')
  console.warn('getTextForVNode: unknown node type', vnode)
  return ''
}

function getElementForVNodeChild(child: VNodeChild): HTMLElement | null {
  if (child == null) return null
  if (typeof child === 'string') return null
  if (Array.isArray(child)) {
    for (const c of child) {
      const element = getElementForVNodeChild(c)
      if (element != null) return element
    }
    return null
  }
  if (typeof child === 'object' && 'el' in child) return getElementForVNode(child)
  return null
}

export function getElementForVNode(vnode: VNode): HTMLElement | null {
  const el = vnode.el
  if (el instanceof HTMLElement) return el
  const children = vnode.children
  if (children == null) return null
  if (typeof children === 'string') return null
  if (Array.isArray(children)) {
    for (const child of children) {
      const element = getElementForVNodeChild(child)
      if (element != null) return element
    }
    return null
  }
  return null
}

export function useSlotText(name = 'default', trimLineBreaks = false) {
  const slots = useSlots()
  return computed(() => {
    let text = getTextForVNodeChild(slots[name]?.())
    if (trimLineBreaks) text = doTrimLineBreaks(text)
    return text
  })
}
