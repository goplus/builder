import { filename } from '@/utils/path'
import { createFileWithWebUrl } from '@/models/common/cloud'
import type { Files } from '@/models/common/file'
import { Backdrop } from '@/models/spx/backdrop'
import { basicChineseFontFamilyName, createBasicChineseFontFamily } from '@/models/spx/font'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'

const templateAssetUrls = import.meta.glob('./default-project/assets/**/*', {
  eager: true,
  import: 'default',
  query: '?url'
}) as Record<string, string>

const thumbnailUrl = new URL('./default-project/thumbnail.jpeg', import.meta.url).href
const templateAssetPrefix = './default-project/'

function getTemplateAssets(): Files {
  return Object.fromEntries(
    Object.entries(templateAssetUrls).map(([path, url]) => {
      const assetPath = path.slice(templateAssetPrefix.length)
      return [assetPath, createFileWithWebUrl(url, filename(assetPath))]
    })
  )
}

export async function createDefaultProject(owner: string, name: string, fontPreferences: string[]) {
  const project = new SpxProject(owner, name)
  const files = getTemplateAssets()
  const backdropFile = files['assets/backdrop.png']!
  backdropFile.meta.imgSize = { width: 480, height: 360 }
  project.stage.addBackdrop(new Backdrop('backdrop', backdropFile, { bitmapResolution: 2, pivot: { x: 120, y: 90 } }))
  project.stage.setExtraConfig({ autoSetCollisionLayer: true, stretchMode: true })

  const sprite = await Sprite.load('NiuXiaoQi', files, { sounds: [] })
  if (sprite == null) throw new Error('default sprite not found')
  project.addSprite(sprite)

  project.setThumbnail(createFileWithWebUrl(thumbnailUrl, 'thumbnail.jpeg'))
  project.setFontPreferences(fontPreferences)
  if (fontPreferences.includes(basicChineseFontFamilyName)) {
    project.addFont(createBasicChineseFontFamily())
  }
  return project
}
