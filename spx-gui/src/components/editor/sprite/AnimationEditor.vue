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
import { shallowRef, watchEffect } from 'vue'
import type { Sprite } from '@/models/sprite'
import EditorList from '../common/EditorList.vue'
import { UIMenu, UIMenuItem, useModal, UIEmpty, UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import AnimationDetail from './AnimationDetail.vue'
import GroupCostumesModal from '@/components/asset/animation/GroupCostumesModal.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { Animation } from '@/models/animation'
import AnimationItem from './AnimationItem.vue'
import galleryIcon from './gallery.svg'

const props = defineProps<{
  sprite: Sprite
}>()

const editorCtx = useEditorCtx()

const selectedAnimation = shallowRef<Animation | null>(props.sprite.animations[0] || null)

watchEffect(() => {
  if (
    selectedAnimation.value == null ||
    !props.sprite.animations.includes(selectedAnimation.value)
  ) {
    selectedAnimation.value = props.sprite.animations[0] ?? null
  }
})

const groupCostumes = useModal(GroupCostumesModal)

const handleGroupCostumes = useMessageHandle(
  async () => {
    const { selectedCostumes, removeCostumes } = await groupCostumes({
      sprite: props.sprite
    })

    editorCtx.project.history.doAction(
      {
        name: { en: 'Group costumes as animation', zh: '将造型合并为动画' }
      },
      () => {
        const animation = Animation.create(
          '',
          selectedCostumes.map((costume) => costume.clone())
        )
        props.sprite.addAnimation(animation)
        if (removeCostumes) {
          for (let i = selectedCostumes.length - 1; i >= 0; i--) {
            // Do not remove the last costume
            if (props.sprite.costumes.length <= 1) break
            props.sprite.removeCostume(selectedCostumes[i].name)
          }
        }
        selectedAnimation.value = animation
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
