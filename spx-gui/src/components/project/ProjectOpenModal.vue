<template>
  <UIFormModal
    :title="$t({ en: 'Open project', zh: '打开项目' })"
    :style="{ width: '936px' }"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <ProjectList :style="{ maxHeight: '570px' }" @selected="$emit('resolved', $event)" />
  </UIFormModal>
</template>

<script lang="ts" setup>
import { UIFormModal } from '@/components/ui'
import ProjectList from './ProjectList.vue'
import { type ProjectData } from '@/apis/project'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [ProjectData]
}>()

function handleCancel() {
  emit('cancelled')
}
</script>

<style lang="scss" scoped></style>
