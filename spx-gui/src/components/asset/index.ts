import { useMessage, useModal } from '@/components/ui'
import { AssetType } from '@/apis/asset'
import { selectAudio, selectFile, selectImg, selectImgs } from '@/utils/file'
import { parseScratchFileAssets } from '@/utils/scratch'
import { stripExt } from '@/utils/path'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import type { AssetModel } from '@/models/common/asset'
import { fromNativeFile } from '@/models/common/file'
import { type Project } from '@/models/project'
import { Backdrop } from '@/models/backdrop'
import { Sound } from '@/models/sound'
import { Sprite } from '@/models/sprite'
import { Animation } from '@/models/animation'
import { saveFiles } from '@/models/common/cloud'
import { Monitor } from '@/models/widget/monitor'
import SoundRecorderModal from '../editor/sound/SoundRecorderModal.vue'
import AssetLibraryModal from './library/AssetLibraryModal.vue'
import AssetAddModal from './library/AssetAddModal.vue'
import LoadFromScratchModal from './scratch/LoadFromScratchModal.vue'
import PreprocessModal from './preprocessing/PreprocessModal.vue'
import GroupCostumesModal from './animation/GroupCostumesModal.vue'
// TODO: Consider moving these components from `components/editor/` to `components/asset/`
import SpriteRenameModal from '../editor/panels/sprite/SpriteRenameModal.vue'
import SoundRenameModal from '../editor/sound/SoundRenameModal.vue'
import CostumeRenameModal from '../editor/sprite/CostumeRenameModal.vue'
import BackdropRenameModal from '../editor/stage/backdrop/BackdropRenameModal.vue'
import AnimationRenameModal from '../editor/sprite/AnimationRenameModal.vue'
import WidgetRenameModal from '../editor/stage/widget/WidgetRenameModal.vue'

function selectAsset(project: Project, asset: AssetModel | undefined) {
  if (asset instanceof Sprite) project.select({ type: 'sprite', id: asset.id })
  else if (asset instanceof Sound) project.select({ type: 'sound', id: asset.id })
  else if (asset instanceof Backdrop) {
    project.select({ type: 'stage' })
    project.stage.setDefaultBackdrop(asset.id)
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

export function useAddSpriteFromLocalFile(autoSelect = true) {
  const preprocess = useModal(PreprocessModal)
  return async function addSpriteFromLocalFile(project: Project) {
    const actionMessage = { en: 'Add sprite', zh: '添加精灵' }
    const nativeFiles = await selectImgs()
    const files = nativeFiles.map((f) => fromNativeFile(f))
    const spriteName = files.length > 1 ? '' : stripExt(files[0].name)
    const sprite = Sprite.create(spriteName)
    const costumes = await preprocess({
      files,
      title: actionMessage,
      confirmText: { en: 'Add', zh: '添加' }
    })
    for (const costume of costumes) {
      sprite.addCostume(costume)
    }
    await project.history.doAction({ name: actionMessage }, async () => {
      project.addSprite(sprite)
      await sprite.autoFitCostumes()
      await sprite.autoFit()
    })
    if (autoSelect) selectAsset(project, sprite)
    return sprite
  }
}

export function useAddCostumeFromLocalFile(autoSelect = true) {
  const preprocess = useModal(PreprocessModal)
  return async function addCostumeFromLocalFile(sprite: Sprite, project: Project) {
    const actionMessage = { en: 'Add costume', zh: '添加造型' }
    const nativeFiles = await selectImgs()
    const files = nativeFiles.map((f) => fromNativeFile(f))
    const costumes = await preprocess({
      files,
      title: actionMessage,
      confirmText: { en: 'Add', zh: '添加' }
    })
    await project.history.doAction({ name: actionMessage }, async () => {
      for (const costume of costumes) sprite.addCostume(costume)
      await sprite.autoFitCostumes(costumes)
      if (autoSelect) sprite.setDefaultCostume(costumes[0].id)
    })
    return costumes
  }
}

export function useAddSoundFromLocalFile(autoSelect = true) {
  const m = useMessage()
  const { t } = useI18n()
  const { isOnline } = useNetwork()
  return async function addSoundFromLocalFile(project: Project) {
    const audio = await selectAudio()
    const sound = await Sound.create(stripExt(audio.name), fromNativeFile(audio))

    if (isOnline.value) {
      await m.withLoading(saveFiles(sound.export()), t({ en: 'Uploading files', zh: '上传文件中' }))
    }

    const action = { name: { en: 'Add sound', zh: '添加声音' } }
    await project.history.doAction(action, () => project.addSound(sound))
    if (autoSelect) selectAsset(project, sound)
    return sound
  }
}

export function useAddSoundByRecording(autoSelect = true) {
  const invokeSoundRecorderModal = useModal(SoundRecorderModal)
  return async function addSoundFromRecording(project: Project): Promise<Sound> {
    const sound = await invokeSoundRecorderModal({ project })
    if (autoSelect) selectAsset(project, sound)
    return sound
  }
}

export function useAddBackdropFromLocalFile(autoSelect = true) {
  const m = useMessage()
  const { t } = useI18n()
  const { isOnline } = useNetwork()
  return async function addBackdropFromLocalFile(project: Project) {
    const img = await selectImg()
    const file = fromNativeFile(img)
    const backdrop = await Backdrop.create(stripExt(img.name), file)
    const action = { name: { en: 'Add backdrop', zh: '添加背景' } }

    if (isOnline.value) {
      const [, backdropFiles] = backdrop.export()
      await m.withLoading(saveFiles(backdropFiles), t({ en: 'Uploading files', zh: '上传文件中' }))
    }

    await project.history.doAction(action, () => {
      const stage = project.stage
      stage.addBackdrop(backdrop)
      if (autoSelect) stage.setDefaultBackdrop(backdrop.id)
    })
    return backdrop
  }
}

export function useAddAnimationByGroupingCostumes() {
  const invokeGroupCostumesModal = useModal(GroupCostumesModal)
  return async function addAnimationByGroupingCostumes(project: Project, sprite: Sprite) {
    const { selectedCostumes, removeCostumes } = await invokeGroupCostumesModal({ sprite })
    const action = { name: { en: 'Group costumes as animation', zh: '合并造型为动画' } }
    return project.history.doAction(action, () => {
      const costumes = selectedCostumes.map((costume) => costume.clone())
      const animation = Animation.create('', costumes)
      sprite.addAnimation(animation)
      if (removeCostumes) {
        for (let i = selectedCostumes.length - 1; i >= 0; i--) {
          // Do not remove the last costume
          if (sprite.costumes.length <= 1) break
          sprite.removeCostume(selectedCostumes[i].id)
        }
      }
      return animation
    })
  }
}

export function useAddMonitor(autoSelect = true) {
  return async function addMonitor(project: Project) {
    const monitor = await Monitor.create()
    const action = { name: { en: 'Add widget', zh: '添加控件' } }
    await project.history.doAction(action, () => {
      project.stage.addWidget(monitor)
      if (autoSelect) project.stage.selectWidget(monitor.id)
    })
    return monitor
  }
}

export function useRenameSprite() {
  return useModal(SpriteRenameModal)
}

export function useRenameSound() {
  return useModal(SoundRenameModal)
}

export function useRenameCostume() {
  return useModal(CostumeRenameModal)
}

export function useRenameBackdrop() {
  return useModal(BackdropRenameModal)
}

export function useRenameAnimation() {
  return useModal(AnimationRenameModal)
}

export function useRenameWidget() {
  return useModal(WidgetRenameModal)
}
