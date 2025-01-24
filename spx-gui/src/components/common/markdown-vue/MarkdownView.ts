import { computed, defineComponent, h, type VNode, type Component } from 'vue'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { html, find } from 'property-information'
import type * as hast from 'hast'
import { toHast } from 'mdast-util-to-hast'
import { raw } from 'hast-util-raw'
import { defaultSchema, sanitize, type Schema as SanitizeSchema } from 'hast-util-sanitize'

type Components = {
  /** Component for rendering code blocks */
  codeBlock?: Component
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
   * Or: (for custom elements whose content contains blank lines, see details in https://github.com/goplus/builder/pull/1193)
   * ```markdown
   * <pre is="my-comp1" prop1="value1" prop2="value2">
   *  Content
   * </pre>
   * ```
   */
  custom?: Record<string, Component>
}

export type Props = {
  /** Markdown string */
  value: string
  components?: Components
}

export default defineComponent<Props>(
  (props, { attrs }) => {
    const hastNodes = computed(() => {
      const customComponents = props.components?.custom ?? {}
      const mdast = fromMarkdown(props.value)
      const hast = toHast(mdast, { allowDangerousHtml: true })
      const rawProcessed = raw(hast, { tagfilter: false })
      const sanitizeSchema = getSanitizeSchema(customComponents)
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

function renderHastNodes(node: hast.Nodes, attrs: Record<string, unknown>, components: Components) {
  if (node.type === 'root') {
    return h(
      'div',
      attrs,
      node.children.map((child, i) => renderHastNode(child, components, i))
    )
  }
  return h('div', attrs, [renderHastNode(node, components)])
}

type VRendered = VNode | string | null | VRendered[]

function renderHastNode(node: hast.Node, components: Components, key?: string | number): VRendered {
  switch (node.type) {
    case 'element':
      return renderHastElement(node as hast.Element, components, key)
    case 'text':
      return (node as hast.Text).value
    default:
      return null
  }
}

function renderHastElement(element: hast.Element, components: Components, key?: string | number): VNode {
  let props: Record<string, string | number | boolean>
  let type: string | Component
  let children: VRendered | (() => VRendered) | undefined
  const customComponents = components.custom ?? {}
  if (Object.prototype.hasOwnProperty.call(customComponents, element.tagName)) {
    type = customComponents[element.tagName]
    props = hastProps2VueProps(element.properties)
    children = renderComponentChildren(element.children, components)
  } else if (
    element.tagName === 'pre' &&
    typeof element.properties.is === 'string' &&
    Object.prototype.hasOwnProperty.call(customComponents, element.properties.is)
  ) {
    const { is, ...properties } = element.properties
    type = customComponents[is]
    props = hastProps2VueProps(properties)
    children = renderComponentChildren(element.children, components)
  } else if (
    // Render code blocks with `components.codeBlock`
    // TODO: It may be simpler to recognize & process code blocks based on mdast instead of hast
    components.codeBlock != null &&
    element.tagName === 'pre' &&
    element.children[0]?.type === 'element' &&
    element.children[0].tagName === 'code'
  ) {
    type = components.codeBlock
    const codeEl = element.children[0]
    const className = codeEl.properties?.className
    let language = ''
    if (typeof className === 'string') {
      language = className.split('-')[1]
    } else if (Array.isArray(className) && typeof className[0] === 'string') {
      language = className[0].split('-')[1]
    }
    props = { language }
    children = renderComponentChildren(codeEl.children, components)
  } else {
    type = element.tagName
    props = hastProps2VueProps(element.properties)
    children = element.children.map((c, i) => renderHastNode(c, components, i))
  }
  // There's issue when children of custom component (for exmaple `DefinitionOverviewWrapper`) updated: the component will not be notified,
  // here we use random key to force re-render the component as a workaround. TODO: find the reason and fix it
  key = key + '' + Math.random()
  return h(type, { ...props, key }, children)
}

function renderComponentChildren(children: hast.ElementContent[], components: Components) {
  if (children.length === 0) return undefined
  // Use function slot for components' children to avoid Vue warning:
  // [Vue warn]: Non-function value encountered for default slot. Prefer function slots for better performance.
  return () => children.map((c, i) => renderHastNode(c, components, i))
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

/** Get sanitize schema for `hast-util-sanitize` to prevent XSS */
function getSanitizeSchema(customComponents: Record<string, Component>): SanitizeSchema {
  const allCustomPropNames: string[] = []
  const tagNames = [...(defaultSchema.tagNames ?? [])]
  const attributes = { ...defaultSchema.attributes }
  Object.entries(customComponents).forEach(([tagName, component]) => {
    tagNames.push(tagName)
    const propNames = getComponentPropNames(component).map(camelCase2KebabCase)
    allCustomPropNames.push(...propNames)
    attributes[tagName] = propNames
  })
  attributes.pre = [...(defaultSchema.attributes?.pre ?? []), 'is', ...allCustomPropNames]
  return { tagNames, attributes }
}
