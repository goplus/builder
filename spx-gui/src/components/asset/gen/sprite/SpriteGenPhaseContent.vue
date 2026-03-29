<!--
  Phase "content" for sprite-gen:
  * Generate more costumes & animations
  * Make sprite
-->

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { capture, useMessageHandle } from '@/utils/exception'
import type { Sprite } from '@/models/spx/sprite'
import type { SpriteGen } from '@/models/spx/gen/sprite-gen'
import type { CostumeGen } from '@/models/spx/gen/costume-gen'
import type { AnimationGen } from '@/models/spx/gen/animation-gen'
import { UIButton, UITooltip, useConfirmDialog, type ConfirmOptions } from '@/components/ui'
import { useRenameAnimationGen, useRenameCostumeGen } from '../..'
import CostumeSettingInput from '../costume/CostumeSettingsInput.vue'
import AnimationSettingInput from '../animation/AnimationSettingsInput.vue'
import ListItemWrapper from '../common/ListItemWrapper.vue'
import CostumeGenItem from '../costume/CostumeGenItem.vue'
import AnimationGenItem from '../animation/AnimationGenItem.vue'
import CostumeGenPreview from '../costume/CostumeGenPreview.vue'
import AnimationGenPreview from '../animation/AnimationGenPreview.vue'
import { humanizeListWithLimit } from '@/utils/utils'

const props = defineProps<{
  gen: SpriteGen
}>()

const emit = defineEmits<{
  collapse: []
  resolved: [Sprite]
}>()

const selected = computed(() => {
  const selectedItem = props.gen.selectedItem
  if (selectedItem == null) return null
  const { type, id } = selectedItem
  switch (type) {
    case 'costume':
      return { type: 'costume', costume: props.gen.getCostumeById(id) }
    case 'animation':
      return { type: 'animation', animation: props.gen.getAnimationById(id) }
    default:
      return null
  }
})

function select(type: 'costume' | 'animation', id: string) {
  props.gen.setSelectedItem({ type, id })
}

watch(
  selected,
  (selected) => {
    // Select the first item of current type if no item is selected
    if (selected?.animation != null || selected?.costume != null) return
    if (selected?.type === 'animation' && props.gen.animations.length > 0) {
      select('animation', props.gen.animations[0].id)
    } else if (props.gen.costumes.length > 0) {
      select('costume', props.gen.costumes[0].id)
    }
  },
  { immediate: true }
)

const selectedCostume = computed(() => selected.value?.costume ?? null)
const selectedAnimation = computed(() => selected.value?.animation ?? null)

const renameCostume = useRenameCostumeGen()
const handleRenameCostume = useMessageHandle(renameCostume, {
  en: 'Failed to rename costume',
  zh: '重命名造型失败'
}).fn

const handleRemoveCostume = useMessageHandle((costumeGen: CostumeGen) => props.gen.removeCostume(costumeGen.id), {
  en: 'Failed to remove costume',
  zh: '删除造型失败'
}).fn

function handleAddCostume() {
  const costumeGen = props.gen.addCostume()
  select('costume', costumeGen.id)
}

const renameAnimation = useRenameAnimationGen()
const handleRenameAnimation = useMessageHandle(renameAnimation, {
  en: 'Failed to rename animation',
  zh: '重命名动画失败'
}).fn

const handleRemoveAnimation = useMessageHandle(
  (animationGen: AnimationGen) => props.gen.removeAnimation(animationGen.id),
  {
    en: 'Failed to remove animation',
    zh: '删除动画失败'
  }
).fn

function handleAddAnimation() {
  const animationGen = props.gen.addAnimation()
  select('animation', animationGen.id)
}

const i18n = useI18n()
const confirm = useConfirmDialog()

function isCostumeGenProcessing(costumeGen: CostumeGen) {
  return costumeGen.generateState.status !== 'initial' && costumeGen.result == null
}
function isAnimationGenProcessing(animationGen: AnimationGen) {
  return animationGen.generateVideoState.status !== 'initial' && animationGen.result == null
}
function toCapitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
async function beforeSubmit() {
  const { costumes, animations } = props.gen
  const finishedCostumes = costumes.filter((c) => c.result != null)
  const finishedAnimations = animations.filter((a) => a.result != null)
  const unfinishedCostumes = costumes.filter(isCostumeGenProcessing)
  const unfinishedAnimations = animations.filter(isAnimationGenProcessing)

  let options: Omit<ConfirmOptions, 'title'> | null = null
  if (unfinishedCostumes.length > 0 || unfinishedAnimations.length > 0) {
    const toLocaleMessage = (gen: CostumeGen | AnimationGen) => ({ en: gen.name, zh: gen.name })
    const content: LocaleMessage[] = []
    if (unfinishedCostumes.length > 0) {
      const unfinishedNames = humanizeListWithLimit(unfinishedCostumes.map(toLocaleMessage), 3)
      content.push({
        zh: `造型（${unfinishedNames.zh}）`,
        en: `costume (${unfinishedNames.en})`
      })
    }
    if (unfinishedAnimations.length > 0) {
      const unfinishedNames = humanizeListWithLimit(unfinishedAnimations.map(toLocaleMessage), 3)
      content.push({
        zh: `动画（${unfinishedNames.zh}）`,
        en: `animation (${unfinishedNames.en})`
      })
    }
    options = {
      // There will be at least one task that is running or failed
      content: i18n.t({
        zh: `${content.map((c) => c.zh).join('和')}还没有完成，确定要放弃它们并采用当前已经完成的内容吗？`,
        en: `${toCapitalize(content.map((c) => c.en).join(' and '))} have not been completed, are you sure to abandon them and use the currently completed content?`
      }),
      cancelText: i18n.t({ zh: '返回', en: 'Back' }),
      confirmText: i18n.t({ zh: '仍要采用', en: 'Use anyway' })
    }
  } else if (
    finishedCostumes.length === 1 &&
    finishedAnimations.length === 0 && // only default costume generated
    costumes.length + animations.length > 1 // while there are other unfinished items
  ) {
    options = {
      content: i18n.t({
        zh: '添加更多造型或动画可以让你的精灵更加生动。确定不添加，直接采用吗？',
        en: 'Adding more costumes or animations can make your sprite more lively. Are you sure to use it directly without adding more?'
      }),
      cancelText: i18n.t({ zh: '继续添加', en: 'Continue adding' })
    }
  }

  if (options != null) {
    return confirm({
      type: 'info',
      title: i18n.t({ zh: '采用精灵', en: 'Use sprite' }),
      confirmText: i18n.t({ zh: '直接采用', en: 'Use directly' }),
      ...options
    })
  }
}

const handleSubmit = useMessageHandle(
  async () => {
    await beforeSubmit()
    const sprite = props.gen.finish()
    props.gen.recordAdoption().catch((err) => {
      capture(err, 'failed to record sprite asset adoption')
    })
    emit('resolved', sprite)
  },
  {
    en: 'Failed to create sprite',
    zh: '创建精灵失败'
  }
)
</script>

<template>
  <main
    v-radar="{ name: 'Sprite generation content phase', desc: 'Sprite costume and animation generation' }"
    class="phase-content"
  >
    <div class="body">
      <aside class="left">
        <div class="gen-list">
          <ListItemWrapper v-radar="{ name: 'Costume list', desc: 'List of costumes' }" @add="handleAddCostume">
            <template #title>{{ $t({ zh: '造型', en: 'Costume' }) }}</template>
            <CostumeGenItem
              v-for="c in gen.costumes"
              :key="c.id"
              :active="selectedCostume?.id === c.id"
              :gen="c"
              :is-default="c.id === gen.defaultCostume?.id"
              :operable="{ removable: c.id !== gen.defaultCostume?.id }"
              @click="select('costume', c.id)"
              @rename="handleRenameCostume(c)"
              @remove="handleRemoveCostume(c)"
            />
          </ListItemWrapper>

          <ListItemWrapper v-radar="{ name: 'Animation list', desc: 'List of animations' }" @add="handleAddAnimation">
            <template #title>{{ $t({ zh: '动画', en: 'Animation' }) }}</template>
            <AnimationGenItem
              v-for="a in gen.animations"
              :key="a.id"
              :active="selectedAnimation?.id === a.id"
              :gen="a"
              @click="select('animation', a.id)"
              @rename="handleRenameAnimation(a)"
              @remove="handleRemoveAnimation(a)"
            />
          </ListItemWrapper>
        </div>

        <div class="gen-settings">
          <CostumeSettingInput v-if="selectedCostume != null" :gen="selectedCostume" />
          <AnimationSettingInput v-if="selectedAnimation != null" :gen="selectedAnimation" />
        </div>
      </aside>
      <div class="preview">
        <CostumeGenPreview v-if="selectedCostume != null" :gen="selectedCostume" />
        <AnimationGenPreview v-else-if="selectedAnimation != null" :gen="selectedAnimation" />
      </div>
    </div>
    <footer class="footer">
      <UITooltip>
        {{
          $t({
            zh: '收起弹窗，任务将在后台继续进行，可随时查看',
            en: 'Minimize the popup, the task will continue in the background and can be viewed at any time'
          })
        }}
        <template #trigger>
          <UIButton
            v-radar="{
              name: 'Minimize',
              desc: 'Click to minimize the sprite generation modal'
            }"
            color="secondary"
            size="large"
            @click="emit('collapse')"
          >
            {{ $t({ en: 'Minimize', zh: '收起' }) }}
          </UIButton>
        </template>
      </UITooltip>
      <!-- TODO: Consider adding a "cancel" button here to cancel the generation process -->
      <UIButton
        v-radar="{ name: 'Use', desc: 'Click to finish and use the generated sprite in the project' }"
        color="primary"
        size="large"
        :loading="handleSubmit.isLoading.value"
        @click="handleSubmit.fn"
      >
        {{ $t({ en: 'Use', zh: '采用' }) }}
      </UIButton>
    </footer>
  </main>
</template>

<style lang="scss" scoped>
.phase-content {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
}

.body {
  flex: 1 1 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.left {
  flex: 0 0 auto;
  width: 408px;
  padding-top: 16px;
  background: var(--ui-color-grey-100);
  border-right: 1px solid var(--ui-color-grey-400);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.preview {
  flex: 1 1 0;
  display: flex;
  position: relative;
  overflow: hidden;
}

.footer {
  width: 100%;
  flex: 0 0 auto;
  padding: 20px 24px;
  display: flex;
  justify-content: end;
  gap: 16px;
}

.gen-list {
  flex: 1 1 0;
  padding: 0 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.gen-settings {
  padding: 20px 16px;
  margin-top: 0;
}
</style>
