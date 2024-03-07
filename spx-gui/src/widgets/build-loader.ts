import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const currentDir = path.dirname(fileURLToPath(import.meta.url))
console.log(import.meta)
import { resolveConfig } from 'vite'

export default async function BuilderLoader(outputOptions, baseurl) {
  console.log(outputOptions)
  const outputDir = outputOptions.dir
  const manifestPath = path.join(outputDir, '.vite/manifest.json')
  const files = fs.readdirSync(outputDir)
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent)
    let entryItem
    for (const key in manifest) {
      if (manifest[key].isEntry) {
        console.log(manifest[key])
        entryItem = manifest[key]
        break
      }
    }
    const css = entryItem.css[0]
    const js = entryItem.file
    const loaderJs = fs
      .readFileSync(path.join(currentDir, 'loader.ts'), { encoding: 'utf8' })
      .replace(/JSURL/g, `"${baseurl + js}"`)
      .replace(/CSSURL/g, `"${baseurl + css}"`)
    console.log('base', baseurl,`"${baseurl + js}"`)

    const compiledFilePath = path.join(currentDir, 'compiled-loader.js')
    fs.writeFileSync(compiledFilePath, loaderJs, 'utf-8')
  } catch (error) {
    console.error(error)
  }
}
