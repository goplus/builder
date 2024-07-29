<template>
  <UIModal style="width: 1076px" :visible="props.visible" @update:visible="emit('cancelled')">
    <AssetLibrary
      :type="props.type"
      :project="props.project"
      @resolved="emit('resolved', $event)"
      @cancelled="emit('cancelled')"
      @update:visible="emit('cancelled')"
    />
  </UIModal>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import UIModal from '@/components/ui/modal/UIModal.vue'
import { AssetType } from '@/apis/asset'
import { categories as categoriesWithoutAll, categoryAll } from './category'
import { type Project } from '@/models/project'
import { type AssetModel } from '@/models/common/asset'
import AssetLibrary from './AssetLibrary.vue'

const props = defineProps<{
type: AssetType
visible: boolean
project: Project
}>()

const emit = defineEmits<{
cancelled: []
resolved: [AssetModel[]]
}>()

</script>

<style lang="scss" scoped>

</style>