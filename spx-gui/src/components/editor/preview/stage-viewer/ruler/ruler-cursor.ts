import rulerSvg from './triangle-ruler-cursor.svg?raw'

function cursorUrl(size: number, outlined: boolean) {
  // Leave room for the outline without moving the original cursor hotspot.
  const padding = size / 8
  let svg = rulerSvg
    .replace('width="32" height="32"', `width="${size + padding * 2}" height="${size + padding * 2}"`)
    .replace('viewBox="0 0 24 23.4716"', 'viewBox="-3 -3 30 30"')
  if (outlined) {
    svg = svg.replace('<path ', '<path stroke="white" stroke-opacity="0.65" stroke-width="3" paint-order="stroke" ')
  }
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${padding} ${padding}, crosshair`
}

export const rulerCursors = {
  normal: cursorUrl(32, false),
  normalOutlined: cursorUrl(32, true),
  simple: cursorUrl(48, false),
  simpleOutlined: cursorUrl(48, true)
}
