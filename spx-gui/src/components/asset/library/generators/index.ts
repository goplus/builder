import { useModal } from '@/components/ui'
import type { Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'
import type { AssetSettings } from '@/models/common/asset'
import SpriteGeneratorModal, { isSpriteGeneration, type SpriteGeneration } from './SpriteGeneratorModal.vue'
import CostumeGeneratorModal from './CostumeGeneratorModal.vue'
import AnimationGeneratorModal from './AnimationGeneratorModal.vue'
import BackdropGeneratorModal from './BackdropGeneratorModal.vue'
import SoundGeneratorModal from './SoundGeneratorModal.vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'

export type { AnimationGeneratorState } from './AnimationGenerator.vue'
export type { SpriteGeneratorState } from './SpriteGenerator.vue'
export { isSpriteGeneration, type SpriteGeneration } from './SpriteGeneratorModal.vue'

export function useSpriteGeneratorModal() {
  const generate = useModal(SpriteGeneratorModal)
  return async function openSpriteGeneratorModal(
    project: Project,
    settings?: AssetSettings,
    savedState?: SpriteGeneration['state']
  ): Promise<Sprite | SpriteGeneration> {
    const result = await generate({ project, settings, savedState })
    if (isSpriteGeneration(result)) {
      return result
    }
    await project.history.doAction({ name: { en: 'Generate sprite', zh: '生成精灵' } }, () => project.addSprite(result))
    return result
  }
}

export function useCostumeGeneratorModal() {
  const project = useEditorCtx().project
  const generate = useModal(CostumeGeneratorModal)
  return async function openCostumeGeneratorModal(sprite: Sprite, settings?: AssetSettings) {
    const costume = await generate({ sprite, settings })
    await project.history.doAction({ name: { en: 'Generate costume', zh: '生成造型' } }, () =>
      sprite.addCostume(costume)
    )
    return costume
  }
}

export function useAnimationGeneratorModal() {
  const project = useEditorCtx().project
  const generate = useModal(AnimationGeneratorModal)
  return async function openAnimationGeneratorModal(sprite: Sprite, settings?: AssetSettings) {
    const animation = await generate({ sprite, settings })
    await project.history.doAction({ name: { en: 'Generate animation', zh: '生成动画' } }, () =>
      sprite.addAnimation(animation)
    )
    return animation
  }
}

export function useBackdropGeneratorModal() {
  const generate = useModal(BackdropGeneratorModal)
  return async function openBackdropGeneratorModal(project: Project, settings?: AssetSettings) {
    const backdrop = await generate({ project, settings })
    await project.history.doAction({ name: { en: 'Generate backdrop', zh: '生成背景' } }, () =>
      project.stage.addBackdrop(backdrop)
    )
    return backdrop
  }
}

export function useSoundGeneratorModal() {
  const generate = useModal(SoundGeneratorModal)
  return async function openSoundGeneratorModal(project: Project, settings?: AssetSettings) {
    const sound = await generate({ project, settings })
    await project.history.doAction({ name: { en: 'Generate sound', zh: '生成声音' } }, () => project.addSound(sound))
    return sound
  }
}
