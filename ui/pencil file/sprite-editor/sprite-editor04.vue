<template>
  <div class="sprite-editor-root" :style="rootStyle">
    <PNode
      v-for="child in root.children || []"
      :key="child.id"
      :node="child"
      :parent="root"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import doc from './sprite-editor04.json'

type PenNode = {
  type?: string
  id?: string
  name?: string
  x?: number
  y?: number
  width?: number | string
  height?: number | string
  layout?: string
  gap?: number
  padding?: number | number[]
  justifyContent?: string
  alignItems?: string
  clip?: boolean
  fill?: any
  stroke?: any
  effect?: any
  cornerRadius?: number | number[]
  opacity?: number
  content?: string
  lineHeight?: number
  textAlign?: string
  textAlignVertical?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  geometry?: string
  children?: PenNode[]
}

const root = (doc as any).children?.[0] as PenNode

const rootStyle = computed(() => {
  const base = nodeStyle(root, null)
  const vars = (doc as any).variables || {}
  const cssVars: Record<string, string> = {}
  Object.entries(vars).forEach(([key, value]) => {
    const val = (value as any)?.value ?? value
    if (val != null) cssVars[key] = String(val)
  })
  return {
    ...base,
    ...cssVars,
    position: 'relative',
    boxSizing: 'border-box',
  }
})

const PNode = defineComponent({
  name: 'PNode',
  props: {
    node: { type: Object as () => PenNode, required: true },
    parent: { type: Object as () => PenNode | null, default: null },
  },
  setup(props) {
    return () => renderNode(props.node, props.parent)
  },
})

function renderNode(node: PenNode, parent: PenNode | null) {
  const style = nodeStyle(node, parent)
  const commonProps: Record<string, any> = {
    style,
    class: ['pnode', node.type ? `type-${node.type}` : null],
    'data-node-name': node.name || undefined,
  }

  if (node.type === 'text') {
    return h('span', commonProps, node.content || '')
  }

  if (node.type === 'path') {
    const size = svgSize(node)
    const attrs: Record<string, any> = {
      width: size.width,
      height: size.height,
      viewBox: `0 0 ${size.width} ${size.height}`,
      xmlns: 'http://www.w3.org/2000/svg',
    }
    const pathStyle = resolvePathPaint(node)
    return h(
      'svg',
      { ...commonProps, ...attrs },
      [h('path', { d: node.geometry || '', ...pathStyle })]
    )
  }

  const children = (node.children || []).map((child) =>
    h(PNode, { key: child.id, node: child, parent: node })
  )

  const tag = node.type === 'ellipse' ? 'div' : 'div'
  return h(tag, commonProps, children)
}

function nodeStyle(node: PenNode, parent: PenNode | null) {
  const style: Record<string, any> = {
    boxSizing: 'border-box',
  }

  const parentIsFlex = parent?.layout && parent.layout !== 'none'
  if (!parentIsFlex && typeof node.x === 'number' && typeof node.y === 'number') {
    style.position = 'absolute'
    style.left = `${node.x}px`
    style.top = `${node.y}px`
  } else {
    style.position = 'relative'
  }

  applySize(style, node)
  applyLayout(style, node)
  applyPadding(style, node)
  applyCornerRadius(style, node)
  applyFill(style, node)
  applyClip(style, node)
  applyOpacity(style, node)
  applyEffect(style, node)
  applyTextStyle(style, node)

  if (parentIsFlex && (node.width === 'fill_container' || node.height === 'fill_container')) {
    style.flex = '1 1 0%'
  }

  if (node.type === 'ellipse') {
    style.borderRadius = '50%'
  }

  return style
}

function applySize(style: Record<string, any>, node: PenNode) {
  if (node.width != null) style.width = toSize(node.width)
  if (node.height != null) style.height = toSize(node.height)
}

function toSize(value: number | string) {
  if (typeof value === 'number') return `${value}px`
  if (value === 'fill_container') return '100%'
  return value
}

function applyLayout(style: Record<string, any>, node: PenNode) {
  if (node.layout && node.layout !== 'none') {
    style.display = 'flex'
    style.flexDirection = node.layout === 'horizontal' ? 'row' : 'column'
    if (typeof node.gap === 'number') style.gap = `${node.gap}px`
    if (node.justifyContent) style.justifyContent = mapAlign(node.justifyContent)
    if (node.alignItems) style.alignItems = mapAlign(node.alignItems)
  }
}

function applyPadding(style: Record<string, any>, node: PenNode) {
  if (node.padding == null) return
  if (typeof node.padding === 'number') {
    style.padding = `${node.padding}px`
    return
  }
  if (Array.isArray(node.padding)) {
    if (node.padding.length === 2) {
      style.padding = `${node.padding[0]}px ${node.padding[1]}px`
    } else if (node.padding.length === 4) {
      style.padding = node.padding.map((v) => `${v}px`).join(' ')
    } else if (node.padding.length === 1) {
      style.padding = `${node.padding[0]}px`
    }
  }
}

function applyCornerRadius(style: Record<string, any>, node: PenNode) {
  if (node.cornerRadius == null) return
  if (typeof node.cornerRadius === 'number') {
    style.borderRadius = `${node.cornerRadius}px`
    return
  }
  if (Array.isArray(node.cornerRadius)) {
    style.borderRadius = node.cornerRadius.map((v) => `${v}px`).join(' ')
  }
}

function applyFill(style: Record<string, any>, node: PenNode) {
  if (node.type === 'text' || node.type === 'path') return
  const fill = resolveFill(node.fill)
  if (!fill) return
  if (fill.type === 'color') {
    style.backgroundColor = fill.value
  } else if (fill.type === 'gradient') {
    style.backgroundImage = fill.value
  } else if (fill.type === 'image') {
    style.backgroundImage = fill.value
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
  }
}

function applyClip(style: Record<string, any>, node: PenNode) {
  if (node.clip) style.overflow = 'hidden'
}

function applyOpacity(style: Record<string, any>, node: PenNode) {
  if (typeof node.opacity === 'number') style.opacity = node.opacity
}

function applyEffect(style: Record<string, any>, node: PenNode) {
  const eff = node.effect
  if (!eff || eff.type !== 'shadow') return
  const color = resolveColor(eff.color)
  if (!color) return
  const x = eff.offset?.x ?? 0
  const y = eff.offset?.y ?? 0
  const blur = eff.blur ?? 0
  style.boxShadow = `${x}px ${y}px ${blur}px ${color}`
}

function applyTextStyle(style: Record<string, any>, node: PenNode) {
  if (node.type !== 'text') return
  const fill = resolveFill(node.fill)
  if (fill?.type === 'color') style.color = fill.value
  if (node.fontFamily) style.fontFamily = node.fontFamily
  if (node.fontSize) style.fontSize = `${node.fontSize}px`
  if (node.fontWeight) style.fontWeight = node.fontWeight
  if (node.lineHeight) style.lineHeight = `${node.lineHeight}px`
  if (node.textAlign) style.textAlign = node.textAlign
  style.whiteSpace = 'pre-wrap'
}

function resolveFill(fill: any): { type: 'color' | 'gradient' | 'image'; value: string } | null {
  if (!fill) return null
  if (typeof fill === 'string') {
    return { type: 'color', value: resolveColor(fill) || fill }
  }
  if (fill.type === 'color') {
    if (fill.enabled === false) return null
    const color = resolveColor(fill.color)
    if (!color) return null
    return { type: 'color', value: color }
  }
  if (fill.type === 'gradient') {
    const colors = (fill.colors || [])
      .map((stop: any) => `${resolveColor(stop.color) || stop.color} ${stop.position * 100}%`)
      .join(', ')
    const angle = typeof fill.rotation === 'number' ? fill.rotation : 0
    return { type: 'gradient', value: `linear-gradient(${angle}deg, ${colors})` }
  }
  if (fill.type === 'image') {
    if (!fill.url) return null
    return { type: 'image', value: `url(${fill.url})` }
  }
  return null
}

function resolveColor(value: any): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    if (value.startsWith('$--')) return `var(${value.slice(1)})`
    return value
  }
  if (typeof value === 'object' && value.type === 'color') {
    if (value.enabled === false) return null
    return resolveColor(value.color)
  }
  return null
}

function resolvePathPaint(node: PenNode) {
  const fill = resolveFill(node.fill)
  const strokeFill = resolveFill(node.stroke?.fill)
  const result: Record<string, any> = {}
  if (fill?.type === 'color') result.fill = fill.value
  if (!fill && strokeFill?.type === 'color') result.fill = 'none'
  if (strokeFill?.type === 'color') {
    result.stroke = strokeFill.value
    if (node.stroke?.thickness) result['stroke-width'] = node.stroke.thickness
  }
  return result
}

function svgSize(node: PenNode) {
  const width = typeof node.width === 'number' ? node.width : 0
  const height = typeof node.height === 'number' ? node.height : 0
  return { width, height }
}

function mapAlign(value: string) {
  switch (value) {
    case 'start':
      return 'flex-start'
    case 'end':
      return 'flex-end'
    case 'center':
      return 'center'
    case 'space_between':
      return 'space-between'
    case 'space_around':
      return 'space-around'
    case 'space_evenly':
      return 'space-evenly'
    default:
      return value
  }
}
</script>

<style scoped>
.sprite-editor-root {
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.pnode {
  box-sizing: border-box;
}
</style>
