import { useModal } from '@/components/ui'
import { AssetType } from '@/apis/asset'
import { Backdrop } from '@/models/backdrop'
import { Sound } from '@/models/sound'
import { Sprite } from '@/models/sprite'
import { selectAudio, selectFile, selectImgs } from '@/utils/file'
import { parseScratchFileAssets } from '@/utils/scratch'
import type { AssetModel } from '@/models/common/asset'
import { stripExt } from '@/utils/path'
import { Costume } from '@/models/costume'
import { fromNativeFile } from '@/models/common/file'
import type { Project } from '@/models/project'
import AssetLibraryModal from './library/AssetLibraryModal.vue'
import AssetAddModal from './library/AssetAddModal.vue'
import LoadFromScratchModal from './scratch/LoadFromScratchModal.vue'

function selectAsset(project: Project, asset: AssetModel | undefined) {
  if (asset instanceof Sprite) project.select({ type: 'sprite', name: asset.name })
  else if (asset instanceof Sound) project.select({ type: 'sound', name: asset.name })
  else if (asset instanceof Backdrop) {
    project.select({ type: 'stage' })
    project.stage.setDefaultBackdrop(asset.name)
  }
}

export function useAddAssetFromLibrary() {
  const invokeAssetLibraryModal = useModal(AssetLibraryModal)
  return async function addAssetFromLibrary<T extends AssetType>(project: Project, type: T) {
    const added = await invokeAssetLibraryModal({ project, type }) as Array<AssetModel<T>>
    selectAsset(project, added[0])
    return added
  }
}

export function useAddAssetToLibrary() {
  const invokeAddAssetModal = useModal(AssetAddModal)
  return function addAssetToLibrary(asset: Backdrop | Sound | Sprite) {
    return invokeAddAssetModal({ asset })
  }
}

export function useLoadFromScratchModal() {
  const invokeModal = useModal(LoadFromScratchModal)
  return async function loadFromScratchModal(project: Project) {
    const file = await selectFile({ accept: '.sb3' })
    const exportedScratchAssets = await parseScratchFileAssets(file)
    const imported = await invokeModal({ project, exportedScratchAssets })
    selectAsset(project, imported[0])
    return imported
  }
}

export function useAddSpriteFromLocalFile() {
  return async function addSpriteFromLocalFile(project: Project) {
    const imgs = await selectImgs()
    const spriteName = imgs.length > 1 ? '' : stripExt(imgs[0].name)
    const sprite = Sprite.create(spriteName)
    const costumes = await Promise.all(
      imgs.map((img) => {
        const costumeName = imgs.length > 1 ? stripExt(img.name) : ''
        return Costume.create(costumeName, fromNativeFile(img))
      })
    )
    for (const costume of costumes) {
      sprite.addCostume(costume)
    }
    project.addSprite(sprite)
    await sprite.autoFit()
    selectAsset(project, sprite)
    return sprite
  }
}

export function useAddSoundFromLocalFile() {
  return async function addSoundFromLocalFile(project: Project) {
    const audio = await selectAudio()
    const sound = await Sound.create(stripExt(audio.name), fromNativeFile(audio))
    project.addSound(sound)
    selectAsset(project, sound)
    return sound
  }
}
