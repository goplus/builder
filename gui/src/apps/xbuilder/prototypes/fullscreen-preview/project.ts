import { fromText } from '@/models/common/file'
import { Backdrop } from '@/models/spx/backdrop'
import { Costume } from '@/models/spx/costume'
import { SpxProject, type ViewportSize } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'

export const samples = [
  { ratio: '4:3', label: '标准横屏', width: 480, height: 360 },
  { ratio: '16:9', label: '宽屏', width: 640, height: 360 },
  { ratio: '9:16', label: '竖屏', width: 360, height: 640 }
] as const

type Sample = (typeof samples)[number]

class PreviewSample extends SpxProject {
  constructor(override readonly viewportSize: ViewportSize) {
    super()
  }
}

const token = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
  <circle cx="30" cy="30" r="29" fill="#5eead4" fill-opacity=".18"/>
  <circle cx="30" cy="30" r="23" fill="#183957" stroke="#79efd8" stroke-width="2"/>
  <path d="M30 12 35.4 24.6 48 30 35.4 35.4 30 48 24.6 35.4 12 30 24.6 24.6Z" fill="#d4fff2"/>
  <circle cx="30" cy="30" r="5" fill="#5eead4"/>
</svg>`

function sky({ width, height }: Sample) {
  const stars = Array.from({ length: 100 }, (_, i) => {
    const x = (i * 73 + 17) % width
    const y = (i * 97 + 23) % height
    return `<circle cx="${x}" cy="${y}" r="${i % 9 === 0 ? 1.6 : 0.7}" opacity="${(i % 5) / 8 + 0.22}"/>`
  }).join('')
  const rings = [0.31, 0.44, 0.57].map(
    (scale) => `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width * scale}" ry="${height * scale * 0.68}"/>`
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <radialGradient id="sky" cx=".54" cy=".48" r=".72">
        <stop stop-color="#274b78"/><stop offset=".6" stop-color="#182747"/><stop offset="1" stop-color="#0b1224"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#sky)"/>
    <g fill="#b0d6ff">${stars}</g>
    <g fill="none" stroke="#99d2ed" opacity=".30" transform="rotate(-22 ${width / 2} ${height / 2})">${rings.join('')}</g>
    <g fill="none" stroke="#88f2dc" opacity=".6">
      <path d="M20 40V20H40 M${width - 40} 20h20v20 M20 ${height - 40}v20h20 M${width - 40} ${height - 20}h20v-20"/>
    </g>
  </svg>`
}

export function createSampleProject(sample: Sample) {
  const { width, height, ratio } = sample
  const project = new PreviewSample({ width, height })
  const backdrop = fromText('starfield.svg', sky(sample), { meta: { imgSize: { width, height } } })
  project.setDisplayName(`星轨采样 · ${ratio}`)
  project.stage.setMapWidth(width)
  project.stage.setMapHeight(height)
  project.stage.addBackdrop(new Backdrop('Starfield', backdrop, { pivot: { x: width / 2, y: height / 2 } }))
  project.setThumbnail(backdrop)

  const spriteCode = `var sampleIndex int

onClick => {
  xs := []float64{0, ${width * 0.24}, ${-width * 0.29}, ${width * 0.3}, ${-width * 0.18}}
  ys := []float64{0, ${height * 0.32}, ${-height * 0.28}, ${-height * 0.25}, ${height * 0.28}}
  scores := []string{"1 / 5", "2 / 5", "3 / 5", "4 / 5", "5 / 5"}
  say scores[sampleIndex]
  println "SAMPLE_COLLECTED", sampleIndex + 1
  sampleIndex = (sampleIndex + 1) % len(xs)
  setXYpos xs[sampleIndex], ys[sampleIndex]
}
`
  const star = new Sprite('Star', spriteCode, { visible: true, size: 1 })
  star.addCostume(
    new Costume('Sample', fromText('sample.svg', token, { meta: { imgSize: { width: 60, height: 60 } } }), {
      pivot: { x: 30, y: 30 }
    })
  )
  project.addSprite(star)
  return project
}
