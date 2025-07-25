<script lang="ts" setup>
import { UISearchableModal } from '@/components/ui'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()
</script>

<template>
  <UISearchableModal
    class="course-series-modal"
    :visible="props.visible"
    :title="$t({ en: 'Manage course series', zh: '管理课程系列' })"
    @update:visible="emit('cancelled')"
  >
    <div class="placeholder">
      <!-- TODO: Implement course series management UI -->
    </div>
  </UISearchableModal>
</template>

<style lang="scss" scoped>
.course-series-modal {
  width: 1200px;
}

.placeholder {
  padding: 40px;
  text-align: center;
  color: var(--ui-color-grey-600);
}
</style>
