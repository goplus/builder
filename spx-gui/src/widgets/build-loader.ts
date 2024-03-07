import fs from 'fs'
import path from 'path'
import type { NormalizedOutputOptions } from 'rollup'
import { fileURLToPath } from 'url'
const currentDir = path.dirname(fileURLToPath(import.meta.url))
interface WidgetAssets {
  js: string
}
interface WidgetManifest {
  [key: string]: WidgetAssets
}
export default async function BuilderLoader(
  outputOptions: NormalizedOutputOptions,
  baseurl: string
) {
  const outputDir = outputOptions.dir as string
  const manifestPath = path.join(outputDir, '.vite/manifest.json')
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent)
    const manifetMap = {} as WidgetManifest
    for (const key in manifest) {
      // Entry files are treated as widget
      if (manifest[key].isEntry && manifest[key]) {
        // TODO: config the widget name from the rollup config instead
        const widgetNameMatch = key.match(/^src\/widgets\/([^/]+)\/index\.ts$/)
        if (widgetNameMatch && widgetNameMatch[1]) {
          const asset: WidgetAssets = {
            // Stitching the actual resource address
            js: baseurl + manifest[key].file
          }
          manifetMap[widgetNameMatch[1]] = asset
        }
      }
    }

    const loaderJs = fs
      .readFileSync(path.join(currentDir, '/scripts/loader-template.js'), { encoding: 'utf8' })
      .replace(/MANIFEST/g, JSON.stringify(manifetMap))

    console.log('loader', loaderJs)
    const compiledFilePath = path.join(currentDir, '/scripts/compiled-loader.js')

    fs.writeFileSync(compiledFilePath, loaderJs, 'utf-8')
  } catch (error) {
    console.error(error)
  }
}
