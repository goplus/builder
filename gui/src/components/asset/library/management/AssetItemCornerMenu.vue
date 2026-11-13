<script setup lang="ts">
import { Visibility, type AssetData } from '@/apis/asset'
import { UIDropdown, UICornerIcon, UIMenu, UIMenuItem } from '@/components/ui'

defineProps<{
  asset: AssetData
}>()

const emit = defineEmits<{
  publish: []
  unpublish: []
  edit: []
  remove: []
}>()
</script>

<template>
  <UIDropdown trigger="click">
    <template #trigger>
      <UICornerIcon type="more" />
    </template>
    <UIMenu>
      <UIMenuItem v-if="asset.visibility === Visibility.Private" @click="emit('publish')">
        {{ $t({ en: 'Make it public', zh: '设置为公开' }) }}
      </UIMenuItem>
      <UIMenuItem v-else @click="emit('unpublish')">
        {{ $t({ en: 'Make it private', zh: '设置为私有' }) }}
      </UIMenuItem>
      <UIMenuItem @click="emit('edit')">
        {{ $t({ en: 'Edit', zh: '编辑' }) }}
      </UIMenuItem>
      <UIMenuItem @click="emit('remove')">
        {{ $t({ en: 'Remove from asset library', zh: '从素材库中删除' }) }}
      </UIMenuItem>
    </UIMenu>
  </UIDropdown>
</template>
