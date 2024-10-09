<template>
  <UIFormModal
    :title="$t({ en: 'Open project', zh: '打开项目' })"
    :style="{ width: '1020px' }"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <ProjectList :style="{ maxHeight: '570px' }" edit @selected="$emit('resolved')" />
  </UIFormModal>
</template>

<script lang="ts" setup>
import { UIFormModal } from '@/components/ui'
import ProjectList from './MyProjectList.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

function handleCancel() {
  emit('cancelled')
}
</script>

<style lang="scss" scoped></style>
