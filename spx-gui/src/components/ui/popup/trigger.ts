import {
  cloneVNode,
  Comment,
  defineComponent,
  Fragment,
  mergeProps,
  Text,
  type PropType,
  type Ref,
  type VNode
} from 'vue'

// Component refs can participate in popup positioning by exposing the concrete
// trigger element through this shared contract. This lets popup wrappers such as
// UITooltip or UIDropdown still serve as another popup's trigger, which is how
// compositions like UIDropdownWithTooltip keep anchoring to the real DOM node.
export type PopupTriggerHandle = {
  triggerEl: Element | Ref<Element | null> | null
}

export type PopupTriggerTarget = Element | PopupTriggerHandle | { $el?: Node } | null

/**
 * Normalize popup trigger refs to the concrete Element used by positioning
 * and stack logic. This accepts native elements, component instances exposing
 * `triggerEl`, and component instances exposing `$el`. `triggerEl` is
 * preferred for popup wrapper components because their public instance or root
 * `$el` may not be the real anchor element the parent popup should track.
 */
export function resolveTriggerElement(target: PopupTriggerTarget) {
  if (target == null) return null
  if (target instanceof Element) return target
  if ('triggerEl' in target) {
    const triggerEl = target.triggerEl
    if (triggerEl instanceof Element) return triggerEl
    if (triggerEl != null && typeof triggerEl === 'object' && 'value' in triggerEl) {
      return triggerEl.value instanceof Element ? triggerEl.value : null
    }
  }
  if ('$el' in target) return resolveElementFromComponentRoot(target.$el)
  return null
}

function resolveElementFromComponentRoot(root: Node | undefined) {
  if (root instanceof Element) return root
  if (root == null || (root.nodeType !== Node.COMMENT_NODE && root.nodeType !== Node.TEXT_NODE)) return null

  // In Vue dev mode, comments in a component template can be preserved as DOM
  // anchors. In that case a component public instance may expose `$el` as the
  // leading comment/text node rather than the actual single rendered element.
  // Walk forward to the first real Element so popup triggers keep working
  // with components like UIIcon whose template contains leading comments.
  let current = root?.nextSibling ?? null
  while (current != null) {
    if (current instanceof Element) return current
    current = current.nextSibling
  }
  return null
}

export const PopupRenderTrigger = defineComponent({
  name: 'UIPopupRenderTrigger',
  props: {
    renderNode: {
      type: Function as PropType<() => VNode | null>,
      required: true
    }
  },
  setup(props) {
    return () => props.renderNode()
  }
})

export function renderPopupTrigger(triggerNodes: VNode[] | undefined, triggerProps: Record<string, unknown>) {
  // Slot content may contain comments, fragments, or multiple nodes. Normalize
  // that shape first so popup internals can attach one consistent trigger API.
  const nodes = flattenRenderableTriggerNodes(triggerNodes ?? [])
  if (nodes.length === 0) return null
  if (nodes.length > 1) {
    throw new Error('Popup trigger slot must render exactly one node')
  }
  // Preserve the original trigger node when possible so semantics/styling stay
  // on the caller's element instead of forcing an extra wrapper span.
  return cloneVNode(nodes[0], mergeProps(nodes[0].props ?? {}, triggerProps), true)
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
