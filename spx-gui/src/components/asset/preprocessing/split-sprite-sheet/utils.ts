import { getImgDrawingCtx } from '@/utils/canvas'

export type Point = [x: number, y: number]
export type Color = [r: number, g: number, b: number, a: number]

function getPixel(imageData: ImageData, [x, y]: Point): Color {
  const offset = (imageData.width * y + x) * 4
  return [imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2], imageData.data[offset + 3]]
}

function setPixel(imageData: ImageData, [x, y]: Point, color: Color) {
  const offset = (imageData.width * y + x) * 4
  imageData.data.set(color, offset)
}

function equalsColor(a: Color, b: Color, threshold = 10) {
  return (
    Math.abs(a[0] - b[0]) < threshold &&
    Math.abs(a[1] - b[1]) < threshold &&
    Math.abs(a[2] - b[2]) < threshold &&
    Math.abs(a[3] - b[3]) < threshold
  )
}

export type Region = {
  startX: number
  startY: number
  endX: number
  endY: number
}

function hasOverlap(a: Region, b: Region) {
  return a.startX <= b.endX && a.endX >= b.startX && a.startY <= b.endY && a.endY >= b.startY
}

function growRegion(imageData: ImageData, satrtPoint: Point, bgColor: Color): Region {
  const { width, height } = imageData
  const [startX, startY] = satrtPoint
  const stack = [[startX, startY]]
  const rect: Region = {
    startX: startX,
    startY: startY,
    endX: startX,
    endY: startY
  }
  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    setPixel(imageData, [x, y], bgColor)
    if (x < rect.startX) rect.startX = x
    if (x > rect.endX) rect.endX = x
    if (y < rect.startY) rect.startY = y
    if (y > rect.endY) rect.endY = y
    ;(
      [
        [x - 1, y - 1],
        [x - 1, y],
        [x - 1, y + 1],
        [x, y - 1],
        [x, y + 1],
        [x + 1, y - 1],
        [x + 1, y],
        [x + 1, y + 1]
      ] satisfies Point[]
    ).forEach((p) => {
      if (p[0] < 0 || p[0] >= width || p[1] < 0 || p[1] >= height) return
      if (equalsColor(getPixel(imageData, p), bgColor)) return
      stack.push(p)
    })
  }
  return rect
}

function* getRegions(imageData: ImageData, bgColor: Color) {
  const { width, height } = imageData
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = getPixel(imageData, [x, y])
      if (equalsColor(color, bgColor)) {
        continue
      }
      const region = growRegion(imageData, [x, y], bgColor)
      yield region
    }
  }
}

function mergeRegions(regions: Region[]) {
  const mergedRects: Region[] = []
  for (let i = 0; i < regions.length; i++) {
    const region = { ...regions[i] }
    let toMerge: Region | null = null
    for (const mergedRect of mergedRects) {
      if (hasOverlap(mergedRect, region)) {
        toMerge = mergedRect
        break
      }
    }
    if (toMerge != null) {
      toMerge.startX = Math.min(toMerge.startX, region.startX)
      toMerge.startY = Math.min(toMerge.startY, region.startY)
      toMerge.endX = Math.max(toMerge.endX, region.endX)
      toMerge.endY = Math.max(toMerge.endY, region.endY)
    } else {
      mergedRects.push(region)
    }
  }
  return mergedRects
}

function getBgColor(data: ImageData) {
  // 1px offset for better result (sometimes there's a thin border around the sprite)
  return getPixel(data, [1, 1])
}

export type ExtractYieldedTypeSize = {
  type: 'size'
  width: number
  height: number
}

export type ExtractYieldedTypeBgColor = {
  type: 'bgColor'
  color: Color
}

export type ExtractYieldedTypeRect = {
  type: 'rect'
  rect: Region
}

export type ExtractYieldedTypeRects = {
  type: 'rects'
  rects: Region[]
}

export type ExtractYieldedTypeMergedRects = {
  type: 'mergedRects'
  rects: Region[]
}

export type RowColNum = {
  rowNum: number
  colNum: number
}

export type ExtractYieldedTypeRowCol = {
  type: 'rowCol'
} & RowColNum

type ExtractYielded =
  | ExtractYieldedTypeSize
  | ExtractYieldedTypeBgColor
  | ExtractYieldedTypeRect
  | ExtractYieldedTypeRects
  | ExtractYieldedTypeMergedRects
  | ExtractYieldedTypeRowCol

export async function* recognizeSpriteGrid(img: HTMLImageElement): AsyncGenerator<ExtractYielded> {
  const maxCanvasSize = 1000 * 1000 // to avoid performance issue
  const scale = Math.min(Math.sqrt(maxCanvasSize / (img.naturalWidth * img.naturalHeight)), 1)
  const size = { width: img.naturalWidth * scale, height: img.naturalHeight * scale }
  yield { type: 'size', ...size }

  const canvas = new OffscreenCanvas(size.width, size.height)
  const ctx = getImgDrawingCtx(canvas)
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, canvas.width, canvas.height)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const bgColor = getBgColor(imageData) // TODO: allow caller to adjust color
  yield { type: 'bgColor', color: bgColor }

  const rects: Region[] = []
  for (const rect of getRegions(imageData, bgColor)) {
    rects.push(rect)
    yield { type: 'rect', rect }
  }

  yield { type: 'rects', rects }

  let mergedRects = rects
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const newMergedRects = mergeRegions(mergedRects)
    if (newMergedRects.length === mergedRects.length) break
    mergedRects = newMergedRects
  }

  yield { type: 'mergedRects', rects: mergedRects }

  const rectRows: Region[][] = []
  let rectRow: Region[] = []
  for (let i = 0; i < mergedRects.length; i++) {
    const rect = mergedRects[i]
    const prevRect = mergedRects[i - 1]
    if (prevRect == null || rect.startY < prevRect.endY) {
      rectRow.push(rect)
      continue
    }
    rectRows.push(rectRow)
    rectRow = [rect]
  }
  rectRows.push(rectRow)
  const colNum = Math.max(...rectRows.map((row) => row.length))
  const rowNum = rectRows.length
  yield { type: 'rowCol', rowNum, colNum }
}

export type CutOptions = RowColNum & {
  bgColor: Color
  mimeType: string
}

export async function cutGrid(img: HTMLImageElement, { rowNum, colNum, bgColor, mimeType }: CutOptions) {
  const rows: Blob[][] = await Promise.all(
    Array.from({ length: rowNum }).map(async (_, rowIndex) => {
      const row = await Promise.all(
        Array.from({ length: colNum }).map((_, colIndex) =>
          cutCell(img, { rowNum, colNum, bgColor, mimeType }, { rowIndex, colIndex })
        )
      )
      return row.filter((blob) => blob != null) as Blob[]
    })
  )
  return rows
}

type CellIndex = {
  rowIndex: number
  colIndex: number
}

function cutCell(
  img: HTMLImageElement,
  { rowNum, colNum, bgColor, mimeType }: CutOptions,
  { rowIndex, colIndex }: CellIndex
) {
  const rectSize = { width: img.naturalWidth / colNum, height: img.naturalHeight / rowNum }
  const canvas = new OffscreenCanvas(rectSize.width, rectSize.height)
  const ctx = getImgDrawingCtx(canvas)
  ctx.drawImage(
    img,
    rectSize.width * colIndex,
    rectSize.height * rowIndex,
    rectSize.width,
    rectSize.height,
    0,
    0,
    canvas.width,
    canvas.height
  )
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const color = getPixel(imageData, [x, y])
      // filter out empty grid
      if (!equalsColor(color, bgColor)) {
        return canvas.convertToBlob({ type: mimeType })
      }
    }
  }
  return null
}
