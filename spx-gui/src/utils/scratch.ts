/*
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-02-29 12:00:04
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-29 15:38:04
 * @FilePath: src/util/scratch.ts
 * @Description: The util of scratch
 */

import JSZip from 'jszip'
import { getMimeFromExt } from '@/utils/file'

/**
 * Represents the detailed information of an asset extracted from a Scratch project file.
 */
export interface AssetFileDetail {
  name: string
  extension: string
  url: string
  blob: Blob
}

/**
 * Describes the structure of a Scratch project
 */
interface ScratchProject {
  targets: Array<{
    costumes: Array<{ md5ext: string; name: string; dataFormat: string }>
    sounds: Array<{ md5ext: string; name: string; dataFormat: string }>
  }>
}

/**
 * Parses a Scratch project file to extract and return asset details.
 *
 * @param {File} file - The Scratch project file to be parsed. (project.sb3)
 * @returns {Promise<AssetFileDetail[]>} A promise that resolves to an array of asset file details.
 */
export const parseScratchFile = async (file: File): Promise<AssetFileDetail[]> => {
  const zip = await JSZip.loadAsync(file)
  const projectJson = await zip.file('project.json')?.async('string')
  if (!projectJson) throw new Error('Project JSON not found in the uploaded file.')

  const projectData: ScratchProject = JSON.parse(projectJson)
  const assetNameMap = new Map<string, string>()

  projectData.targets.forEach((target) => {
    target.costumes.forEach((costume) => {
      assetNameMap.set(costume.md5ext, costume.name + '.' + costume.dataFormat)
    })
    target.sounds.forEach((sound) => {
      assetNameMap.set(sound.md5ext, sound.name + '.' + sound.dataFormat)
    })
  })

  const assetFileDetails: AssetFileDetail[] = []

  for (const filename of Object.keys(zip.files)) {
    const extensionMatch = filename.match(/\.(svg|jpeg|jpg|png|wav|mp3)$/)
    if (extensionMatch) {
      const originalName = assetNameMap.get(filename)
      if (!originalName) continue
      const zipFile = zip.file(filename)
      if (!zipFile) continue
      const fileData = await zipFile.async('blob')
      const mimeType = getMimeFromExt(extensionMatch[1])
      const blob = new Blob([fileData], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const name = originalName.split('.').slice(0, -1).join('.')
      const extension = originalName.split('.').pop() || ''
      assetFileDetails.push({ name, extension, url, blob })
    }
  }
  return assetFileDetails
}
