<template>
  <EditorList color="sprite" :add-text="$t({ en: 'Add costume', zh: '添加造型' })">
    <AnimationItem
      v-for="animation in sprite.animations"
      :key="animation.name"
      :sprite="sprite"
      :animation="animation"
      :selected="selectedAnimation === animation"
      @click="selectedAnimation = animation"
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
import type { Sprite } from '@/models/sprite'
import EditorList from '../common/EditorList.vue'
import { UIMenu, UIMenuItem, useModal } from '@/components/ui'
import { shallowRef, watch } from 'vue'
import AnimationDetail from './AnimationDetail.vue'
import GroupCostumesModal from '@/components/asset/animation/GroupCostumesModal.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { Animation } from '@/models/animation'
import AnimationItem from './AnimationItem.vue'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  sprite: Sprite
}>()

const selectedAnimation = shallowRef<Animation | null>(props.sprite.animations[0] || null)

const editorCtx = useEditorCtx()

const groupCostumes = useModal(GroupCostumesModal)

watch(
  () => props.sprite,
  (sprite) => {
    if (!(selectedAnimation.value && sprite.animations.includes(selectedAnimation.value))) {
      selectedAnimation.value = sprite.animations[0] || null
    }
  }
)

const handleGroupCostumes = useMessageHandle(
  async () => {
    const { selectedCostumes, removeCostumes } = await groupCostumes({
      sprite: props.sprite
    })

    editorCtx.project.history.doAction(
      {
        name: { en: `Group costumes as animation`, zh: `将造型合并为动画` }
      },
      () => {
        const animation = Animation.create(
          '',
          props.sprite,
          selectedCostumes.map((costume) => costume.clone())
        )
        props.sprite.addAnimation(animation)
        if (removeCostumes) {
          for (const costume of selectedCostumes) {
            props.sprite.removeCostume(costume.name)
          }
        }
      }
    )
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
