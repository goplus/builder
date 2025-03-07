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
  <EditorList v-else color="sprite" :add-text="$t({ en: 'Add animation', zh: '添加动画' })">
    <AnimationItem
      v-for="animation in animations"
      :key="animation.id"
      :sprite="sprite"
      :animation="animation"
      :selectable="{ selected: selectedAnimationId === animation.id }"
      removable
      @click="selectedAnimationId = animation.id"
    />
    <template #add-options>
      <UIMenu>
        <TagNode name="group-costumes">
          <UIMenuItem @click="handleGroupCostumes">{{
            $t({ en: 'Group costumes as animation', zh: '将造型合并为动画' })
          }}</UIMenuItem>
        </TagNode>
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
const listFilter = editorCtx.listFilter

const animations = computed(() => {
  const allAnimations = props.sprite.animations
  const { enabled, items } = listFilter.getFilter('animation')

  if (enabled && items.length > 0) {
    return allAnimations.filter((animation) => items.includes(animation.name))
  }

  return allAnimations
})

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
</script>
<style scoped lang="scss">
.background {
  width: 100%;
  height: 100%;
}
</style>
