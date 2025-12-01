/** r, g, b in range of 0-255 */
export type RGB = [r: number, g: number, b: number]
/** r, g, b, a in range of 0-255 */
export type RGBA = [r: number, g: number, b: number, a: number]
/** hue, saturation, and brightness are in the range of 0-360, 0-100, and 0-100 respectively */
export type HSB = [hue: number, saturation: number, brightness: number]
/** hue, saturation, brightness, and alpha are in the range of 0-360, 0-100, 0-100, and 0-100 respectively */
export type HSBA = [hue: number, saturation: number, brightness: number, alpha: number]
/** r, g, b in range of 0-255 */
export type BuilderRGB = RGB
/** r, g, b, a in range of 0-255 */
export type BuilderRGBA = RGBA
/** hue100, saturation, brightness in range of 0-100 */
export type BuilderHSB = [hue100: number, saturation: number, brightness: number]
/** hue100, saturation, brightness, alpha in range of 0-100 */
export type BuilderHSBA = [hue100: number, saturation: number, brightness: number, alpha: number]

/**
 * Converts HSB (Hue, Saturation, Brightness) color model to RGB (Red, Green, Blue) color model.
 * hue, saturation, and brightness are in the range of 0-360, 0-100, and 0-100 respectively.
 * r, g, and b are in the range of 0-255.
 */
export function hsb2rgb(hsb: HSB): RGB {
  let [hue, saturation, brightness] = hsb
  hue = hue % 360
  saturation = saturation / 100
  brightness = brightness / 100
  const c = brightness * saturation
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = brightness - c
  let r = 0
  let g = 0
  let b = 0
  if (hue >= 0 && hue < 60) {
    r = c
    g = x
  } else if (hue >= 60 && hue < 120) {
    r = x
    g = c
  } else if (hue >= 120 && hue < 180) {
    g = c
    b = x
  } else if (hue >= 180 && hue < 240) {
    g = x
    b = c
  } else if (hue >= 240 && hue < 300) {
    r = x
    b = c
  } else if (hue >= 300 && hue < 360) {
    r = c
    b = x
  }
  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)
  return [r, g, b]
}

/**
 * Converts HSB (Hue, Saturation, Brightness) color model to RGB (Red, Green, Blue) color model.
 * r, g, and b are in the range of 0-255.
 * hue, saturation, and brightness are in the range of 0-360, 0-100, and 0-100 respectively.
 */
export function rgb2hsb(rgb: RGB): HSB {
  const [r, g, b] = rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let hue = 0
  let saturation = 0
  let brightness = max / 255
  if (max !== 0) {
    saturation = delta / max
    if (delta !== 0) {
      if (r === max) {
        hue = ((g - b) / delta) * 60
      } else if (g === max) {
        hue = ((b - r) / delta + 2) * 60
      } else {
        hue = ((r - g) / delta + 4) * 60
      }
      if (hue < 0) {
        hue += 360
      }
    }
  }
  saturation = Math.round(saturation * 100)
  brightness = Math.round(brightness * 100)
  return [hue, saturation, brightness]
}

export function builderHSB2rgb(hsb: BuilderHSB): RGB {
  const [hue100, saturation, brightness] = hsb
  const hue = (hue100 / 100) * 360
  return hsb2rgb([hue, saturation, brightness])
}

export function builderHSBA2rgba(hsb: BuilderHSBA): RGBA {
  const [hue100, saturation, brightness, alpha100] = hsb
  const alpha = Math.round((alpha100 / 100) * 255)
  return [...builderHSB2rgb([hue100, saturation, brightness]), alpha]
}

export function rgb2builderHSB(rgb: [r: number, g: number, b: number]): BuilderHSB {
  const [hue, saturation, brightness] = rgb2hsb(rgb)
  const hue100 = Math.round((hue / 360) * 100)
  return [hue100, saturation, brightness]
}

export function rgba2builderHSBA(rgba: [r: number, g: number, b: number, a: number]): BuilderHSBA {
  const [r, g, b, a] = rgba
  const alpha100 = Math.round((a / 255) * 100)
  return [...rgb2builderHSB([r, g, b]), alpha100]
}

/**
 * Converts a hex color string to RGB.
 * Supports formats: #RRGGBB (with or without the leading #).
 */
export function hex2rgb(hex: string): RGB {
  const [r, g, b] = hex2rgba(hex)
  return [r, g, b]
}

/**
 * Converts a hex color string to RGBA.
 * Supports formats: #RRGGBB and #RRGGBBAA (with or without the leading #).
 */
export function hex2rgba(hex: string): RGBA {
  hex = hex.replace(/^#/, '')
  const hex16 = parseInt(hex, 16)
  const hasAlpah = hex.length === 8
  let bit = hasAlpah ? 24 : 16 // 24 for RGBA, 16 for RGB
  const r = (hex16 >> bit) & 0xff
  const g = (hex16 >> (bit -= 8)) & 0xff
  const b = (hex16 >> (bit -= 8)) & 0xff
  const a255 = hasAlpah ? hex16 & 0xff : 0xff
  return [r, g, b, a255]
}

export function builderRGB2BuilderHSB(rgb: BuilderRGB) {
  return rgb2builderHSB(rgb)
}

export function builderRGBA2BuilderHSBA(rgba: BuilderRGBA) {
  return rgba2builderHSBA(rgba)
}

export function rgb2CSSColorString(rgb: RGB): string {
  const [r, g, b] = rgb
  return `rgb(${r}, ${g}, ${b})`
}

export function rgba2CSSColorString(rgba: RGBA): string {
  const [r, g, b, a255] = rgba
  const a = Math.round((a255 / 255) * 100) / 100
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export function builderRGB2CSSColorString(rgb: BuilderRGB): string {
  return rgb2CSSColorString(rgb)
}

export function builderRGBA2CSSColorString(rgba: BuilderRGBA): string {
  return rgba2CSSColorString(rgba)
}

export function builderHSB2CSSColorString(hsb: BuilderHSB): string {
  return rgb2CSSColorString(builderHSB2rgb(hsb))
}

export function builderHSBA2CSSColorString(hsba: BuilderHSBA): string {
  return rgba2CSSColorString(builderHSBA2rgba(hsba))
}
