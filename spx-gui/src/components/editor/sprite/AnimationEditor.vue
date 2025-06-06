<template>
  <UIEmpty v-if="sprite.animations.length === 0" size="extra-large">
    {{ $t({ en: 'No animations', zh: '没有动画' }) }}
    <template #op>
      <UIButton type="boring" size="large" @click="handleGroupCostumes">
        <template #icon>
          <img :src="galleryIcon" />
        </template>
        {{ $t({ en: 'Group costumes as animation', zh: '将造型合并为动画' }) }}
      </UIButton>
    </template>
  </UIEmpty>
  <EditorList
    v-else
    color="sprite"
    :add-text="$t({ en: 'Add animation', zh: '添加动画' })"
    :sortable="{ list: sprite.animations }"
    @sorted="handleSorted"
  >
    <AnimationItem
      v-for="animation in sprite.animations"
      :key="animation.id"
      :sprite="sprite"
      :animation="animation"
      :selectable="{ selected: selectedAnimationId === animation.id }"
      removable
      @click="selectedAnimationId = animation.id"
    />
    <template #add-options>
      <UIMenu>
        <UIMenuItem @click="handleGroupCostumes">{{
          $t({ en: 'Group costumes as animation', zh: '将造型合并为动画' })
        }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #detail>
      <AnimationDetail v-if="selectedAnimation" :animation="selectedAnimation" :sprite="sprite" />
    </template>
  </EditorList>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import type { Sprite } from '@/models/sprite'
import EditorList from '../common/EditorList.vue'
import { UIMenu, UIMenuItem, UIEmpty, UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useAddAnimationByGroupingCostumes } from '@/components/asset'
import AnimationDetail from './AnimationDetail.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import AnimationItem from './AnimationItem.vue'
import galleryIcon from './gallery.svg'

const props = defineProps<{
  sprite: Sprite
}>()

const editorCtx = useEditorCtx()

const selectedAnimationId = ref<string | null>(props.sprite.animations[0]?.id || null)
const selectedAnimation = computed(
  () => props.sprite.animations.find((animation) => animation.id === selectedAnimationId.value) ?? null
)

watchEffect(() => {
  if (selectedAnimationId.value == null || !selectedAnimation.value) {
    selectedAnimationId.value = props.sprite.animations[0]?.id ?? null
  }
})

const addAnimationByGroupingCostumes = useAddAnimationByGroupingCostumes()

const handleGroupCostumes = useMessageHandle(
  async () => {
    const animation = await addAnimationByGroupingCostumes(editorCtx.project, props.sprite)
    selectedAnimationId.value = animation.id
  },
  {
    en: 'Failed to group costumes as animation',
    zh: '将造型合并为动画失败'
  }
).fn

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update animation order', zh: '更新动画顺序' } }
    await editorCtx.project.history.doAction(action, () => props.sprite.moveAnimation(oldIdx, newIdx))
  },
  {
    en: 'Failed to update animation order',
    zh: '更新动画顺序失败'
  }
).fn
</script>
<style scoped lang="scss">
.background {
  width: 100%;
  height: 100%;
}
</style>
