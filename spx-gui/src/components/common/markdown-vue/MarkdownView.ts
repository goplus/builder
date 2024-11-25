import { computed, defineComponent, h, type VNode, type Component } from 'vue'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { html, find } from 'property-information'
import type * as hast from 'hast'
import { toHast } from 'mdast-util-to-hast'
import { raw } from 'hast-util-raw'
import { defaultSchema, sanitize, type Schema } from 'hast-util-sanitize'

export type Props = {
  /** Markdown string */
  value: string
  /**
   * Custom components (key as component name expected to be in kebab-case).
   * Example:
   * ```js
   * {
   *   'my-comp1': MyComp1,
   *   'my-comp2': MyComp2
   * }
   * ```
   * Usage in markdown (prop name expected to be in kebab-case):
   * ```markdown
   * <my-comp1 prop1="value1" prop2="value2" />
   * <my-comp2 prop1="value1" prop2="value2">
   *  Content
   * </my-comp2>
   * ```
   */
  components?: Record<string, Component>
}

export default defineComponent<Props>(
  (props, { attrs }) => {
    const hastNodes = computed(() => {
      const components = props.components ?? {}
      const mdast = fromMarkdown(props.value)
      const hast = toHast(mdast, { allowDangerousHtml: true })
      const rawProcessed = raw(hast, { tagfilter: false })

      // XSS protection
      const sanitizeSchema: Schema = {
        tagNames: (defaultSchema.tagNames ?? []).concat(...Object.keys(components)),
        attributes: {
          ...defaultSchema.attributes,
          ...Object.entries(components).reduce(
            (attrs, [tagName, component]) => {
              attrs[tagName] = getComponentPropNames(component).map(camelCase2KebabCase)
              return attrs
            },
            {} as Record<string, string[]>
          )
        }
      }
      return sanitize(rawProcessed, sanitizeSchema)
    })
    return function render() {
      return renderHastNodes(hastNodes.value, attrs, props.components ?? {})
    }
  },
  {
    name: 'MarkdownView',
    props: {
      value: {
        type: String,
        required: true
      },
      components: {
        type: Object,
        required: false,
        default: () => ({})
      }
    }
  }
)

function renderHastNodes(node: hast.Nodes, attrs: Record<string, unknown>, components: Record<string, Component>) {
  if (node.type === 'root') {
    return h(
      'div',
      attrs,
      node.children.map((child) => renderHastNode(child, components))
    )
  }
  return h('div', attrs, [renderHastNode(node, components)])
}

type VRendered = VNode | string | null | VRendered[]

function renderHastNode(node: hast.Node, components: Record<string, Component>): VRendered {
  switch (node.type) {
    case 'element':
      return renderHastElement(node as hast.Element, components)
    case 'text':
      return (node as hast.Text).value
    default:
      return null
  }
}

function renderHastElement(element: hast.Element, components: Record<string, Component>): VNode {
  const props = hastProps2VueProps(element.properties)
  let type: string | Component
  let children: VRendered | (() => VRendered)
  if (Object.prototype.hasOwnProperty.call(components, element.tagName)) {
    type = components[element.tagName]
    // Use function slot for custom components to avoid Vue warning:
    // [Vue warn]: Non-function value encountered for default slot. Prefer function slots for better performance.
    children = () => element.children.map((c) => renderHastNode(c, components))
  } else {
    type = element.tagName
    children = element.children.map((c) => renderHastNode(c, components))
  }
  return h(type, props, children)
}

function hastProps2VueProps(properties: hast.Properties) {
  return Object.keys(properties).reduce(
    (props, key) => {
      const value = properties[key]
      if (value == null) return props
      const propertyInfo = find(html, key)
      const newKey = propertyInfo.attribute
      const newValue = Array.isArray(value) ? value[0] : value
      props[newKey] = newValue
      return props
    },
    {} as Record<string, string | boolean | number>
  )
}

function camelCase2KebabCase(str: string) {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/^-/, '')
    .toLowerCase()
}

function getComponentPropNames(compDef: Component): string[] {
  const props = (compDef as any).props
  if (props == null) return []
  if (Array.isArray(props)) return props
  return Object.keys(props)
}
