import { cloneVNode, Comment, Fragment, h, mergeProps, Text, type VNode } from 'vue'

export function renderPopupTrigger(triggerNodes: VNode[] | undefined, triggerProps: Record<string, unknown>) {
  // Slot content may contain comments, fragments, or multiple nodes. Normalize
  // that shape first so popup internals can attach one consistent trigger API.
  const nodes = flattenRenderableTriggerNodes(triggerNodes ?? [])
  if (nodes.length === 0) return null
  // Preserve the original trigger node when possible so semantics/styling stay
  // on the caller's element instead of forcing an extra wrapper span.
  if (nodes.length === 1) return cloneVNode(nodes[0], mergeProps(nodes[0].props ?? {}, triggerProps), true)
  return h('span', triggerProps, nodes)
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
