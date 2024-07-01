<template>
  <EditorList color="sprite" :add-text="$t({ en: 'Add costume', zh: '添加造型' })">
    <CostumeItem
      v-for="animation in sprite.animations"
      :key="animation.name"
      :sprite="sprite"
      :costume="animation.costumes[0]"
      :selected="true"
      @click="() => {}"
    />
    <GroupCostumesModal :visible="true" :sprite="sprite" />
    <template #add-options>
      <UIMenu>
        <UIMenuItem @click="() => {}">{{
          $t({ en: 'Select local file', zh: '选择本地文件' })
        }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #detail>
      <div>
        {{ sprite.name }}
      </div>
    </template>
  </EditorList>
</template>

<script setup lang="ts">
import type { Sprite } from '@/models/sprite'
import EditorList from '../common/EditorList.vue'
import CostumeItem from './CostumeItem.vue'
import { UIMenu, UIMenuItem } from '@/components/ui'
import { watchEffect } from 'vue'
import GroupCostumesModal from '@/components/asset/animation/GroupCostumesModal.vue'

const props = defineProps<{
  sprite: Sprite
}>()
watchEffect(() => {
  console.log(props.sprite, props.sprite.animations)
})
</script>
