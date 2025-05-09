/* eslint-disable prefer-const */

/**
 * Converts HSB (Hue, Saturation, Brightness) color model to RGB (Red, Green, Blue) color model.
 * hue, saturation, and brightness are in the range of 0-360, 0-100, and 0-100 respectively.
 * r, g, and b are in the range of 0-255.
 */
export function hsb2rgb(hsb: [hue: number, saturation: number, brightness: number]): [r: number, g: number, b: number] {
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
export function rgb2hsb(rgb: [r: number, g: number, b: number]): [hue: number, saturation: number, brightness: number] {
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

export type BuilderHSB = [hue100: number, saturation: number, brightness: number]

export function builderHSB2rgb(hsb: BuilderHSB): [r: number, g: number, b: number] {
  const [hue100, saturation, brightness] = hsb
  const hue = (hue100 / 100) * 360
  return hsb2rgb([hue, saturation, brightness])
}

export function rgb2builderHSB(rgb: [r: number, g: number, b: number]): BuilderHSB {
  const [hue, saturation, brightness] = rgb2hsb(rgb)
  const hue100 = Math.round((hue / 360) * 100)
  return [hue100, saturation, brightness]
}

export function getCSSColorString(hsb: BuilderHSB): string {
  const [r, g, b] = builderHSB2rgb(hsb)
  return `rgb(${r}, ${g}, ${b})`
}
