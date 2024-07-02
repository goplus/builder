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
import { type Project } from '@/models/project'
import AssetLibraryModal from './library/AssetLibraryModal.vue'
import AssetAddModal from './library/AssetAddModal.vue'
import LoadFromScratchModal from './scratch/LoadFromScratchModal.vue'
import PreprocessModal from './preprocessing/PreprocessModal.vue'

function selectAsset(project: Project, asset: AssetModel | undefined) {
  if (asset instanceof Sprite) project.select({ type: 'sprite', name: asset.name })
  else if (asset instanceof Sound) project.select({ type: 'sound', name: asset.name })
  else if (asset instanceof Backdrop) {
    project.select({ type: 'stage' })
    project.stage.setDefaultBackdrop(asset.name)
  }
}

export function useAddAssetFromLibrary(autoSelect = true) {
  const invokeAssetLibraryModal = useModal(AssetLibraryModal)
  return async function addAssetFromLibrary<T extends AssetType>(project: Project, type: T) {
    const added = (await invokeAssetLibraryModal({ project, type })) as Array<AssetModel<T>>
    if (autoSelect) selectAsset(project, added[0])
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
  const preprocess = useModal(PreprocessModal)
  return async function addSpriteFromLocalFile(project: Project) {
    const actionMessage = { en: 'Add sprite', zh: '添加精灵' }
    const nativeFiles = await selectImgs()
    const files = nativeFiles.map((f) => fromNativeFile(f))
    const spriteName = files.length > 1 ? '' : stripExt(files[0].name)
    const sprite = Sprite.create(spriteName)
    let costumes: Costume[]
    if (files.length > 1) {
      // Now split-sprite-sheet is the only preprocessing method we support, it is meant to be skipped when multiple images are selected.
      // So we can skip the whole preprocessing modal and directly create costumes. In the future we will support more preprocessing methods,
      // such as background-elimination, which is meant to be applied even when multiple images are selected. Then we will not skip the preprocessing modal.
      costumes = await Promise.all(
        files.map((file) => {
          return Costume.create(stripExt(file.name), file)
        })
      )
    } else {
      costumes = await preprocess({ files, actionMessage })
    }
    for (const costume of costumes) {
      sprite.addCostume(costume)
    }
    await project.history.doAction({ name: actionMessage }, async () => {
      project.addSprite(sprite)
      await sprite.autoFit()
    })
    selectAsset(project, sprite)
    return sprite
  }
}

export function useAddCostumeFromLocalFile() {
  const preprocess = useModal(PreprocessModal)
  return async function addCostumeFromLocalFile(sprite: Sprite, project: Project) {
    const actionMessage = { en: 'Add costume', zh: '添加造型' }
    const nativeFiles = await selectImgs()
    const files = nativeFiles.map((f) => fromNativeFile(f))
    let costumes: Costume[]
    if (files.length > 1) {
      // Now split-sprite-sheet is the only preprocessing method we support, it is meant to be skipped when multiple images are selected.
      // So we can skip the whole preprocessing modal and directly create costumes. In the future we will support more preprocessing methods,
      // such as background-elimination, which is meant to be applied even when multiple images are selected. Then we will not skip the preprocessing modal.
      costumes = await Promise.all(
        files.map((file) => {
          return Costume.create(stripExt(file.name), file)
        })
      )
    } else {
      costumes = await preprocess({ files, actionMessage })
    }
    await project.history.doAction({ name: actionMessage }, () => {
      for (const costume of costumes) sprite.addCostume(costume)
      sprite.setDefaultCostume(costumes[0].name)
    })
  }
}

export function useAddSoundFromLocalFile(autoSelect = true) {
  return async function addSoundFromLocalFile(project: Project) {
    const audio = await selectAudio()
    const sound = await Sound.create(stripExt(audio.name), fromNativeFile(audio))
    const action = { name: { en: 'Add sound', zh: '添加声音' } }
    await project.history.doAction(action, () => project.addSound(sound))
    if (autoSelect) selectAsset(project, sound)
    return sound
  }
}
