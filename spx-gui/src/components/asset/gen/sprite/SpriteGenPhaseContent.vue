<!--
  Phase "content" for sprite-gen:
  * Generate more costumes & animations
  * Make sprite
-->

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import type { Sprite } from '@/models/sprite'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import type { CostumeGen } from '@/models/gen/costume-gen'
import type { AnimationGen } from '@/models/gen/animation-gen'
import { UIButton, useConfirmDialog } from '@/components/ui'
import CostumeDetail from '@/components/editor/sprite/CostumeDetail.vue'
import AnimationDetail from '@/components/editor/sprite/AnimationDetail.vue'
import { useRenameAnimationGen, useRenameCostumeGen } from '../..'
import CostumeSettingInput from '../costume/CostumeSettingsInput.vue'
import AnimationSettingInput from '../animation/AnimationSettingsInput.vue'
import ListItemWrapper from '../common/ListItemWrapper.vue'
import CostumeGenItem from '../costume/CostumeGenItem.vue'
import AnimationGenItem from '../animation/AnimationGenItem.vue'
import CostumeGenPreview from '../costume/CostumeGenPreview.vue'
import AnimationGenPreview from '../animation/AnimationGenPreview.vue'

const props = defineProps<{
  gen: SpriteGen
}>()

const emit = defineEmits<{
  collapse: []
  finished: [Sprite]
}>()

type Selected = {
  type: 'costume' | 'animation'
  id: string
}

function getAutoSelected(preferedType: 'costume' | 'animation' = 'costume'): Selected | null {
  if (preferedType === 'costume') {
    if (props.gen.costumes.length > 0) return { type: 'costume', id: props.gen.costumes[0].id }
    if (props.gen.animations.length > 0) return { type: 'animation', id: props.gen.animations[0].id }
  } else {
    if (props.gen.animations.length > 0) return { type: 'animation', id: props.gen.animations[0].id }
    if (props.gen.costumes.length > 0) return { type: 'costume', id: props.gen.costumes[0].id }
  }
  return null
}

const selectedRef = shallowRef<Selected | null>(getAutoSelected())

const selectedCostume = computed(() => {
  const selected = selectedRef.value
  if (selected == null || selected.type !== 'costume') return null
  return props.gen.costumes.find((c) => c.id === selected.id) ?? null
})

const selectedAnimation = computed(() => {
  const selected = selectedRef.value
  if (selected == null || selected.type !== 'animation') return null
  return props.gen.animations.find((c) => c.id === selected.id) ?? null
})

function selectCostume(id: string) {
  selectedRef.value = { type: 'costume', id }
}

function selectAnimation(id: string) {
  selectedRef.value = { type: 'animation', id }
}

const renameCostume = useRenameCostumeGen()
const handleRenameCostume = useMessageHandle(renameCostume, {
  en: 'Failed to rename costume',
  zh: '重命名造型失败'
}).fn

const handleRemoveCostume = useMessageHandle(
  (costumeGen: CostumeGen) => {
    props.gen.removeCostume(costumeGen.id)
    selectedRef.value = getAutoSelected('costume')
  },
  {
    en: 'Failed to remove costume',
    zh: '删除造型失败'
  }
).fn

function handleAddCostume() {
  const costumeGen = props.gen.addCostume()
  selectCostume(costumeGen.id)
}

const renameAnimation = useRenameAnimationGen()
const handleRenameAnimation = useMessageHandle(renameAnimation, {
  en: 'Failed to rename animation',
  zh: '重命名动画失败'
}).fn

const handleRemoveAnimation = useMessageHandle(
  (animationGen: AnimationGen) => {
    props.gen.removeAnimation(animationGen.id)
    selectedRef.value = getAutoSelected('animation')
  },
  {
    en: 'Failed to remove animation',
    zh: '删除动画失败'
  }
).fn

function handleAddAnimation() {
  const animationGen = props.gen.addAnimation()
  selectAnimation(animationGen.id)
}

const i18n = useI18n()
const confirm = useConfirmDialog()

// TODO: register modal hook to prevent close if needed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function beforeModalClose() {
  confirm({
    type: 'warning',
    title: i18n.t({ zh: '确认关闭', en: 'Confirm close' }),
    content: i18n.t({
      zh: '关闭窗口将会丢失所有未保存的生成内容，确定要关闭吗？',
      en: 'Closing this modal will lose all unsaved generated content. Continue?'
    }),
    confirmText: i18n.t({ zh: '关闭', en: 'Close' }),
    cancelText: i18n.t({ zh: '取消', en: 'Cancel' })
  })
}

async function beforeSubmit() {
  const { costumes, animations } = props.gen
  const finishedCostumes = costumes.filter((c) => c.result != null)
  const finishedAnimations = animations.filter((a) => a.result != null)
  if (
    finishedCostumes.length === 1 &&
    finishedAnimations.length === 0 && // only default costume generated
    costumes.length + animations.length > 1 // while there are other unfinished items
  ) {
    return confirm({
      type: 'info',
      title: i18n.t({ zh: '采用精灵', en: 'Use sprite' }),
      content: i18n.t({
        zh: '添加更多造型或动画可以让你的精灵更加生动。确定不添加，直接采用吗？',
        en: 'Adding more costumes or animations can make your sprite more lively. Are you sure to use it directly without adding more?'
      }),
      cancelText: i18n.t({ zh: '继续添加', en: 'Continue adding' }),
      confirmText: i18n.t({ zh: '直接采用', en: 'Use directly' })
    })
  }
}

const handleSubmit = useMessageHandle(
  async () => {
    await beforeSubmit()
    const sprite = props.gen.finish()
    emit('finished', sprite)
  },
  {
    en: 'Failed to create sprite',
    zh: '创建精灵失败'
  }
)
</script>

<template>
  <main class="phase-content">
    <div class="body">
      <aside class="left">
        <div class="gen-list">
          <ListItemWrapper @add="handleAddCostume">
            <template #title>{{ $t({ zh: '造型', en: 'Costume' }) }}</template>
            <CostumeGenItem
              v-for="c in gen.costumes"
              :key="c.id"
              :active="selectedCostume?.id === c.id"
              :gen="c"
              :is-default="c.id === gen.defaultCostume?.id"
              :operable="{ removable: c.id !== gen.defaultCostume?.id }"
              @click="selectCostume(c.id)"
              @rename="handleRenameCostume(c)"
              @remove="handleRemoveCostume(c)"
            />
          </ListItemWrapper>

          <ListItemWrapper @add="handleAddAnimation">
            <template #title>{{ $t({ zh: '动画', en: 'Animation' }) }}</template>
            <AnimationGenItem
              v-for="a in gen.animations"
              :key="a.id"
              :active="selectedAnimation?.id === a.id"
              :gen="a"
              @click="selectAnimation(a.id)"
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
        <template v-if="selectedCostume != null">
          <CostumeGenPreview v-if="selectedCostume.result == null" :gen="selectedCostume" />
          <CostumeDetail v-else class="costume-detail" :sprite="gen.previewSprite" :costume="selectedCostume.result" />
        </template>
        <template v-else-if="selectedAnimation != null">
          <AnimationGenPreview v-if="selectedAnimation.result == null" :gen="selectedAnimation" />
          <AnimationDetail
            v-else
            class="animation-detail"
            :sprite="gen.previewSprite"
            :animation="selectedAnimation.result"
          />
        </template>
      </div>
    </div>
    <footer class="footer">
      <UIButton color="secondary" size="large" @click="emit('collapse')">{{
        $t({ en: 'Minimize', zh: '收起' })
      }}</UIButton>
      <UIButton color="primary" size="large" :loading="handleSubmit.isLoading.value" @click="handleSubmit.fn">{{
        $t({ en: 'Use', zh: '采用' })
      }}</UIButton>
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
  padding: 16px 16px 20px;
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
  border-radius: var(--ui-border-radius-1);
  overflow: hidden;

  .costume-detail,
  .animation-detail {
    background-color: transparent;
  }
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
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.gen-settings {
  margin-top: 0;
}
</style>
