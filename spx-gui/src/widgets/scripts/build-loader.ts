/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-03-08 12:18:48
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-12 18:01:08
 * @FilePath: \spx-gui\src\widgets\scripts\build-loader.ts
 * @Description:
 */
import fs from 'fs'
import path from 'path'
import type { NormalizedOutputOptions } from 'rollup'
import { fileURLToPath } from 'url'
interface WidgetAssets {
  js: string
}
interface WidgetManifest {
  [key: string]: WidgetAssets
}
const currentDir = path.dirname(fileURLToPath(import.meta.url))

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
        // TODO:  get widget name from the rollup config instead
        const widgetNameMatch = key.match(/^src\/widgets\/widget\/([^/]+)\/index\.ts$/)
        if (widgetNameMatch && widgetNameMatch[1]) {
          const asset: WidgetAssets = {
            // Stitching the actual resource address
            js: new URL(manifest[key].file, baseurl).href
          }
          manifetMap[widgetNameMatch[1]] = asset
        }
      }
    }
    // read the loader-template.js and inject manifest
    const loaderJs = fs
      .readFileSync(path.join(currentDir, '/loader-template.js'), { encoding: 'utf8' })
      .replace(/MANIFEST/g, JSON.stringify(manifetMap))

    const widgetOutputDir = path.join(outputDir, '/widgets')
    if (!fs.existsSync(widgetOutputDir)) {
      fs.mkdirSync(widgetOutputDir)
    }
    const compiledFilePath = path.join(widgetOutputDir, '/loader.js')
    fs.writeFileSync(compiledFilePath, loaderJs, 'utf-8')
  } catch (error) {
    console.error(error)
  }
}
