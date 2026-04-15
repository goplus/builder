import { cloneVNode, Comment, Fragment, h, mergeProps, Text, type VNode } from 'vue'

export function renderPopupTrigger(triggerNodes: VNode[] | undefined, triggerProps: Record<string, unknown>) {
  const nodes = flattenRenderableTriggerNodes(triggerNodes ?? [])
  if (nodes.length === 0) return null
  if (nodes.length === 1) return cloneVNode(nodes[0], mergeProps(nodes[0].props ?? {}, triggerProps), true)
  return h('span', triggerProps, nodes)
}

export function resolvePopupTriggerElement(target: Element | { $el?: Element } | null) {
  if (target == null) return null
  if (target instanceof HTMLElement) return target
  if ('triggerEl' in target) {
    const triggerEl = target.triggerEl
    if (triggerEl instanceof HTMLElement) return triggerEl
    if (triggerEl != null && typeof triggerEl === 'object' && 'value' in triggerEl) {
      return triggerEl.value instanceof HTMLElement ? triggerEl.value : null
    }
  }
  if ('$el' in target) return target.$el instanceof HTMLElement ? target.$el : null
  return null
}

function flattenRenderableTriggerNodes(nodes: VNode[]) {
  const result: VNode[] = []
  for (const node of nodes) {
    if (isIgnorableSlotNode(node)) continue
    if (node.type === Fragment && Array.isArray(node.children)) {
      result.push(...flattenRenderableTriggerNodes(node.children as VNode[]))
      continue
    }
    result.push(node)
  }
  return result
}

function isIgnorableSlotNode(node: VNode) {
  return (
    node.type === Comment || (node.type === Text && typeof node.children === 'string' && node.children.trim() === '')
  )
}
