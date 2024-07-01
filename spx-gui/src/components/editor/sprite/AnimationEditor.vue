<template>
  <EditorList color="sprite" :add-text="$t({ en: 'Add costume', zh: '添加造型' })">
    <CostumeItem
      v-for="animation in sprite.animations"
      :key="animation.name"
      :sprite="sprite"
      :costume="animation.costumes[0]"
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
      <AnimationDetail v-if="selectedAnimation" :animation="selectedAnimation" />
    </template>
  </EditorList>
</template>

<script setup lang="ts">
import type { Sprite } from '@/models/sprite'
import EditorList from '../common/EditorList.vue'
import CostumeItem from './CostumeItem.vue'
import { UIMenu, UIMenuItem, useModal } from '@/components/ui'
import { shallowRef } from 'vue'
import AnimationDetail from './AnimationDetail.vue'
import GroupCostumesModal from '@/components/asset/animation/GroupCostumesModal.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  sprite: Sprite
}>()

const selectedAnimation = shallowRef(props.sprite.animations[0])

const editorCtx = useEditorCtx()

const groupCostumes = useModal(GroupCostumesModal)

const handleGroupCostumes = async () => {
  const { animation, removedCostumes } = await groupCostumes({
    sprite: props.sprite
  })

  editorCtx.project.history.doAction(
    {
      name: { en: `Group costumes as animation`, zh: `将造型合并为动画` }
    },
    () => {
      props.sprite.addAnimation(animation)
      for (const costume of removedCostumes) {
        props.sprite.removeCostume(costume.name)
      }
    }
  )
}
</script>
<style scoped lang="scss">
.background {
  width: 100%;
  height: 100%;
}
</style>
