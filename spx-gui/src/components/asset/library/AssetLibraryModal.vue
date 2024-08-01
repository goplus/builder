<template>
  <SearchContextProvider :type="props.type" >
    <UIModal style="width: 1076px" :visible="props.visible" @update:visible="emit('cancelled')">
      <AssetLibrary
        :project="props.project"
        @resolved="emit('resolved', $event)"
        @cancelled="emit('cancelled')"
      />
    </UIModal>
  </SearchContextProvider>
</template>

<script lang="ts" setup>
import UIModal from '@/components/ui/modal/UIModal.vue'
import { AssetType } from '@/apis/asset'
import { type Project } from '@/models/project'
import { type AssetModel } from '@/models/common/asset'
import SearchContextProvider from './SearchContextProvider.vue'
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