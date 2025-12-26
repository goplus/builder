import { useMessage, useModal } from '@/components/ui'
import { AssetType } from '@/apis/asset'
import { getSupportedAudioExts, imgExts, selectFile } from '@/utils/file'
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
import { selectFileWithUploadLimit, selectFilesWithUploadLimit, saveFiles } from '@/models/common/cloud'
import { Monitor } from '@/models/widget/monitor'
import * as assetName from '@/models/common/asset-name'
import { Costume } from '@/models/costume'
import type { Widget } from '@/models/widget'
import RenameModal from '../common/RenameModal.vue'
import SoundRecorderModal from '../editor/sound/SoundRecorderModal.vue'
import { useEditorCtx } from '../editor/EditorContextProvider.vue'
import { useCodeEditorCtx, useRenameWarning } from '../editor/code-editor/context'
import { getResourceIdentifier } from '../editor/code-editor/common'
import AssetLibraryModal from './library/AssetLibraryModal.vue'
import AssetSaveModal from './library/AssetSaveModal.vue'
import LoadFromScratchModal from './scratch/LoadFromScratchModal.vue'
import PreprocessModal from './preprocessing/PreprocessModal.vue'
import GroupCostumesModal from './animation/GroupCostumesModal.vue'
import AssetLibraryManagementModal from './library/management/AssetLibraryManagementModal.vue'
import SpriteGenModal from './gen/sprite/SpriteGenModal.vue'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import BackdropGenModal from './gen/backdrop/BackdropGenModal.vue'
import type { BackdropGen } from '@/models/gen/backdrop-gen'

export function useAddAssetFromLibrary() {
  const invokeAssetLibraryModal = useModal(AssetLibraryModal)
  return async function addAssetFromLibrary<T extends AssetType>(project: Project, type: T) {
    return (await invokeAssetLibraryModal({ project, type })) as Array<AssetModel<T>>
  }
}

export function useSaveAssetToLibrary() {
  const invokeAssetSaveModal = useModal(AssetSaveModal)
  return function saveAssetToLibrary(model: AssetModel) {
    return invokeAssetSaveModal({ model })
  }
}

export function useAssetLibraryManagement() {
  const invokeAssetLibraryManagementModal = useModal(AssetLibraryManagementModal)
  return function manageAssetLibrary(type: AssetType) {
    return invokeAssetLibraryManagementModal({ type })
  }
}

export function useLoadFromScratchModal() {
  const invokeModal = useModal(LoadFromScratchModal)
  return async function loadFromScratchModal(project: Project) {
    const file = await selectFile({ accept: ['sb3'] })
    const exportedScratchAssets = await parseScratchFileAssets(file)
    return invokeModal({ project, exportedScratchAssets })
  }
}

export function useAddSpriteFromLocalFile() {
  const preprocess = useModal(PreprocessModal)
  return async function addSpriteFromLocalFile(project: Project) {
    const actionMessage = { en: 'Add sprite', zh: '添加精灵' }
    const nativeFiles = await selectFilesWithUploadLimit({ accept: imgExts })
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
      await sprite.autoFit()
    })
    return sprite
  }
}

export function useAddCostumeFromLocalFile() {
  const preprocess = useModal(PreprocessModal)
  return async function addCostumeFromLocalFile(sprite: Sprite, project: Project) {
    const actionMessage = { en: 'Add costume', zh: '添加造型' }
    const nativeFiles = await selectFilesWithUploadLimit({ accept: imgExts })
    const files = nativeFiles.map((f) => fromNativeFile(f))
    const costumes = await preprocess({
      files,
      title: actionMessage,
      confirmText: { en: 'Add', zh: '添加' }
    })
    await project.history.doAction({ name: actionMessage }, async () => {
      for (const costume of costumes) sprite.addCostume(costume)
    })
    return costumes
  }
}

export function useAddSoundFromLocalFile() {
  const m = useMessage()
  const { t } = useI18n()
  const { isOnline } = useNetwork()
  return async function addSoundFromLocalFile(project: Project) {
    const audio = await selectFileWithUploadLimit({ accept: await getSupportedAudioExts() })
    const sound = await Sound.create(stripExt(audio.name), fromNativeFile(audio))

    if (isOnline.value) {
      await m.withLoading(saveFiles(sound.export()), t({ en: 'Uploading files', zh: '上传文件中' }))
    }

    const action = { name: { en: 'Add sound', zh: '添加声音' } }
    await project.history.doAction(action, () => project.addSound(sound))
    return sound
  }
}

export function useAddSoundByRecording() {
  const invokeSoundRecorderModal = useModal(SoundRecorderModal)
  return async function addSoundFromRecording(project: Project): Promise<Sound> {
    return invokeSoundRecorderModal({ project })
  }
}

export function useAddBackdropFromLocalFile() {
  const m = useMessage()
  const { t } = useI18n()
  const { isOnline } = useNetwork()
  return async function addBackdropFromLocalFile(project: Project) {
    const img = await selectFileWithUploadLimit({ accept: imgExts })
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

export function useAddMonitor() {
  return async function addMonitor(project: Project) {
    const monitor = await Monitor.create()
    const action = { name: { en: 'Add widget', zh: '添加控件' } }
    await project.history.doAction(action, () => {
      project.stage.addWidget(monitor)
    })
    return monitor
  }
}

export function useRenameSprite() {
  const editorCtx = useEditorCtx()
  const codeEditorCtx = useCodeEditorCtx()
  const invokeRenameModal = useModal(RenameModal)
  const getRenameWarning = useRenameWarning()
  return async function renameSprite(sprite: Sprite) {
    return invokeRenameModal({
      target: {
        name: sprite.name,
        validateName(name) {
          return assetName.validateSpriteName(name, editorCtx.project)
        },
        async applyName(newName) {
          const action = { name: { en: 'Rename sprite', zh: '重命名精灵' } }
          await editorCtx.project.history.doAction(action, async () => {
            await codeEditorCtx.mustEditor().renameResource(getResourceIdentifier(sprite), newName)
            sprite.setName(newName)
          })
        },
        inputTip: assetName.spriteNameTip,
        warning: await getRenameWarning()
      }
    })
  }
}

export function useRenameSound() {
  const editorCtx = useEditorCtx()
  const codeEditorCtx = useCodeEditorCtx()
  const invokeRenameModal = useModal(RenameModal)
  const getRenameWarning = useRenameWarning()
  return async function renameSound(sound: Sound) {
    return invokeRenameModal({
      target: {
        name: sound.name,
        validateName(name) {
          return assetName.validateSoundName(name, editorCtx.project)
        },
        async applyName(newName) {
          const action = { name: { en: 'Rename sound', zh: '重命名声音' } }
          await editorCtx.project.history.doAction(action, async () => {
            await codeEditorCtx.mustEditor().renameResource(getResourceIdentifier(sound), newName)
            sound.setName(newName)
          })
        },
        inputTip: assetName.soundNameTip,
        warning: await getRenameWarning()
      }
    })
  }
}

export function useRenameCostume() {
  const editorCtx = useEditorCtx()
  const codeEditorCtx = useCodeEditorCtx()
  const invokeRenameModal = useModal(RenameModal)
  const getRenameWarning = useRenameWarning()
  return async function renameCostume(costume: Costume) {
    return invokeRenameModal({
      target: {
        name: costume.name,
        validateName(name) {
          return assetName.validateCostumeName(name, costume.parent)
        },
        async applyName(newName) {
          const action = { name: { en: 'Rename costume', zh: '重命名造型' } }
          await editorCtx.project.history.doAction(action, async () => {
            await codeEditorCtx.mustEditor().renameResource(getResourceIdentifier(costume), newName)
            costume.setName(newName)
          })
        },
        inputTip: assetName.costumeNameTip,
        warning: await getRenameWarning()
      }
    })
  }
}

export function useRenameBackdrop() {
  const editorCtx = useEditorCtx()
  const codeEditorCtx = useCodeEditorCtx()
  const invokeRenameModal = useModal(RenameModal)
  const getRenameWarning = useRenameWarning()
  return async function renameBackdrop(backdrop: Backdrop) {
    return invokeRenameModal({
      target: {
        name: backdrop.name,
        validateName(name) {
          return assetName.validateBackdropName(name, editorCtx.project.stage)
        },
        async applyName(newName) {
          const action = { name: { en: 'Rename backdrop', zh: '重命名背景' } }
          await editorCtx.project.history.doAction(action, async () => {
            await codeEditorCtx.mustEditor().renameResource(getResourceIdentifier(backdrop), newName)
            backdrop.setName(newName)
          })
        },
        inputTip: assetName.backdropNameTip,
        warning: await getRenameWarning()
      }
    })
  }
}

export function useRenameAnimation() {
  const editorCtx = useEditorCtx()
  const codeEditorCtx = useCodeEditorCtx()
  const invokeRenameModal = useModal(RenameModal)
  const getRenameWarning = useRenameWarning()
  return async function renameAnimation(animation: Animation) {
    return invokeRenameModal({
      target: {
        name: animation.name,
        validateName(name) {
          return assetName.validateAnimationName(name, animation.sprite)
        },
        async applyName(newName) {
          const action = { name: { en: 'Rename animation', zh: '重命名动画' } }
          await editorCtx.project.history.doAction(action, async () => {
            await codeEditorCtx.mustEditor().renameResource(getResourceIdentifier(animation), newName)
            animation.setName(newName)
          })
        },
        inputTip: assetName.animationNameTip,
        warning: await getRenameWarning()
      }
    })
  }
}

export function useRenameWidget() {
  const editorCtx = useEditorCtx()
  const codeEditorCtx = useCodeEditorCtx()
  const invokeRenameModal = useModal(RenameModal)
  const getRenameWarning = useRenameWarning()
  return async function renameWidget(widget: Widget) {
    return invokeRenameModal({
      target: {
        name: widget.name,
        validateName(name) {
          return assetName.validateWidgetName(name, editorCtx.project.stage)
        },
        async applyName(newName) {
          const action = { name: { en: 'Rename widget', zh: '重命名控件' } }
          await editorCtx.project.history.doAction(action, async () => {
            await codeEditorCtx.mustEditor().renameResource(getResourceIdentifier(widget), newName)
            widget.setName(newName)
          })
        },
        inputTip: assetName.widgetNameTip,
        warning: await getRenameWarning()
      }
    })
  }
}

export function useSpriteGenModal() {
  const invokeModal = useModal(SpriteGenModal)
  return function spriteGenModal(spriteGen: SpriteGen) {
    return invokeModal({ gen: spriteGen })
  }
}

export function useBackdropGenModal() {
  const invokeModal = useModal(BackdropGenModal)
  return function backdropGenModal(backdropGen: BackdropGen) {
    return invokeModal({ gen: backdropGen })
  }
}
