<!--
  Phase "content" for sprite-gen:
  * Generate more costumes & animations
  * Make sprite
-->

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { Sprite } from '@/models/sprite'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import { UIButton } from '@/components/ui'
import GenPanel from '../common/GenPanel.vue'
import CostumeSettingInput from '../costume/CostumeSettingsInput.vue'
import AnimationSettingInput from '../animation/AnimationSettingsInput.vue'
import ListItemWrapper from '../common/ListItemWrapper.vue'
import CostumeGenItem from '../costume/CostumeGenItem.vue'
import AnimationGenItem from '../animation/AnimationGenItem.vue'
import CostumeGenPreview from '../costume/CostumeGenPreview.vue'
import AnimationGenPreview from '../animation/AnimationGenPreview.vue'
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'

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

const selectedRef = shallowRef<Selected | null>(null)

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

function handleAddCostume() {
  const costumeGen = props.gen.addCostume()
  selectCostume(costumeGen.id)
}

function handleAddAnimation() {
  const animationGen = props.gen.addAnimation()
  selectAnimation(animationGen.id)
}

const allowSubmit = computed(() => {
  // TODO: check if any unfinished tasks
  return true
})

const handleSubmit = useMessageHandle(
  () => {
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
    <GenPanel class="body">
      <template #left>
        <div class="gen-list">
          <ListItemWrapper @add="handleAddCostume">
            <template #title>{{ $t({ zh: '造型', en: 'Costume' }) }}</template>
            <CostumeGenItem
              v-for="c in gen.costumes"
              :key="c.id"
              :active="selectedCostume?.id === c.id"
              :gen="c"
              @click="selectCostume(c.id)"
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
            />
          </ListItemWrapper>
        </div>

        <div class="gen-settings">
          <CostumeSettingInput v-if="selectedCostume != null" :gen="selectedCostume" />
          <AnimationSettingInput v-if="selectedAnimation != null" :gen="selectedAnimation" />
        </div>
      </template>
      <template #right>
        <div class="gen-preview">
          <CheckerboardBackground class="background" />
          <!-- TODO: use `CostumeDetail` / `AnimationDetail` if costume / animation item already generated -->
          <CostumeGenPreview v-if="selectedCostume != null" :gen="selectedCostume" />
          <AnimationGenPreview v-if="selectedAnimation != null" :gen="selectedAnimation" />
        </div>
      </template>
    </GenPanel>
    <footer class="footer">
      <UIButton color="secondary" size="large" @click="emit('collapse')">{{
        $t({ en: 'Collapse', zh: '收起' })
      }}</UIButton>
      <UIButton
        color="primary"
        size="large"
        :disabled="!allowSubmit"
        :loading="handleSubmit.isLoading.value"
        @click="handleSubmit.fn"
        >{{ $t({ en: 'Next', zh: '下一步' }) }}</UIButton
      >
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
  overflow-y: auto;
  max-height: 400px;
}

.gen-settings {
  margin-top: 60px;
}

.gen-preview {
  flex: 1;
  margin: 20px 24px;
  position: relative;
  border-radius: var(--ui-border-radius-1);
  overflow: hidden;

  .background {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
}
</style>
