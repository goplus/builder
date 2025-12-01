import { computed, defineComponent, h, type VNode, type Component } from 'vue'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { html, find } from 'property-information'
import type * as hast from 'hast'
import { toHast } from 'mdast-util-to-hast'
import { raw } from 'hast-util-raw'
import { defaultSchema, sanitize, type Schema as SanitizeSchema } from 'hast-util-sanitize'

export type Components = {
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
   * Or:
   * (ATTENTION: It is preferred to use `customRaw` instead of `custom` for these custom elements.)
   * For custom elements whose content contains blank lines (see details in https://github.com/goplus/builder/pull/1193), `pre` with `is` is supported:
   * ```markdown
   * <pre is="my-comp1" prop1="value1" prop2="value2">
   *  Content
   * </pre>
   * ```
   */
  custom?: Record<string, Component>
  /**
   * Custom raw components (key as component name expected to be in kebab-case).
   * About raw components, see https://github.com/micromark/micromark/blob/774a70c6bae6dd94486d3385dbd9a0f14550b709/packages/micromark-util-html-tag-name/readme.md#htmlrawnames
   * Example:
   * ```js
   * {
   *   'custom-raw-component': CustomRawComponent
   * }
   * ```
   * Usage in markdown:
   * ```markdown
   * <custom-raw-component>
   * Content1
   *
   * Content2
   * Content3
   * </custom-raw-component>
   * ```
   */
  customRaw?: Record<string, Component>
  // TODO: support custom block elements
}

export type Props = {
  /** Markdown string */
  value: string
  components?: Components
}

export default defineComponent<Props>(
  (props, { attrs }) => {
    const hastNodes = computed(() => parseMarkdown(props))
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

export type CustomComponentUsage = {
  name: string
  props: Record<string, string | number | boolean>
}

export function findCustomComponentUsages({ value, components }: Props): CustomComponentUsage[] {
  const hastNodes = parseMarkdown({ value, components })
  const rootContents: hast.RootContent[] = hastNodes.type === 'root' ? hastNodes.children : [hastNodes]
  return rootContents.flatMap((node) => findCustomComponentUsagesInNode(node, components ?? {}))
}

function findCustomComponentUsagesInNode(node: hast.Node, components: Components): CustomComponentUsage[] {
  if (node.type !== 'element') return []
  const element = node as hast.Element
  const customComponents = { ...components.custom, ...components.customRaw }
  if (Object.prototype.hasOwnProperty.call(customComponents, element.tagName)) {
    return [{ name: element.tagName, props: hastProps2VueProps(element.properties) }]
  } else if (
    element.tagName === 'pre' &&
    typeof element.properties.is === 'string' &&
    Object.prototype.hasOwnProperty.call(customComponents, element.properties.is)
  ) {
    const { is, ...properties } = element.properties
    return [{ name: is, props: hastProps2VueProps(properties) }]
  } else {
    return element.children.flatMap((child) => findCustomComponentUsagesInNode(child, components))
  }
}

/**
 * Process custom raw components in the markdown string.
 * By transforming `<custom-raw-component>...</custom-raw-component>` to `<pre is="custom-raw-component"></pre>`,
 * we allow custom raw components to contain content like blank lines.
 */
export function preprocessCustomRawComponents(value: string, tagNames: string[]) {
  tagNames.forEach((tagName) => {
    value = value.replace(new RegExp(`<${tagName}([^>]*)>`, 'g'), `<pre is="${tagName}"$1>`)
    value = value.replace(new RegExp(`</${tagName}>`, 'g'), '</pre>')
  })
  return value
}

/**
 * Preprocesses custom self-closing elements in a Markdown string.
 * According to the Markdown specification, a custom self-closing element followed by a line break
 * and subsequent text will be merged into a single html_block, which is standard behavior
 * but not the desired result.
 *
 * For example:
 * ```markdown
 * <custom-component/>
 * Content1
 * ```
 * will be preprocessed into:
 * ```markdown
 * <custom-component></custom-component>
 * Content1
 * ```
 * Refer to: https://github.com/goplus/builder/issues/2472
 */
export function preprocessSelfClosingComponents(value: string, tagNames: string[]) {
  tagNames.forEach((tagName) => {
    value = value.replace(new RegExp(`<${tagName}([^>]*?)\\s*/>`, 'g'), `<${tagName}$1></${tagName}>`)
  })
  return value
}

/**
 * Process incomplete tags in the markdown string.
 * By removing the last incomplete tag, we ensure that the markdown is well-formed.
 * This is useful for streaming cases.
 */
export function preprocessIncompleteTags(value: string, tagNames: string[]) {
  const lastTagIndex = value.lastIndexOf('<')
  const lastTagEndIndex = value.lastIndexOf('>')
  if (lastTagIndex > lastTagEndIndex) value = value.slice(0, lastTagIndex)

  tagNames.forEach((tagName) => {
    const lastIndex = value.lastIndexOf(`<${tagName}`)
    if (lastIndex === -1) return
    const lastCloseIndex = value.lastIndexOf(`</${tagName}>`)
    const lastSelfCloseIndex = value.lastIndexOf(`/>`)
    if (lastIndex > lastCloseIndex && lastIndex > lastSelfCloseIndex) value = value.slice(0, lastIndex)
  })
  return value
}

function parseMarkdown({ value, components }: Props): hast.Nodes {
  const customComponents = { ...components?.custom, ...components?.customRaw }
  const customTagNames = Object.keys(customComponents)
  value = preprocessCustomRawComponents(value, Object.keys(components?.customRaw ?? {}))
  value = preprocessSelfClosingComponents(value, customTagNames)
  value = preprocessIncompleteTags(value, customTagNames)
  const mdast = fromMarkdown(value)
  const hast = toHast(mdast, { allowDangerousHtml: true })
  const rawProcessed = raw(hast, { tagfilter: false })
  const sanitizeSchema = getSanitizeSchema(customComponents)
  return sanitize(rawProcessed, sanitizeSchema)
}

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
  const customComponents = { ...components.custom, ...components.customRaw }
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
  // here we use random key to force re-render the component as a workaround.
  // TODO: check https://github.com/goplus/builder/pull/2433 and remove this workaround.
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
