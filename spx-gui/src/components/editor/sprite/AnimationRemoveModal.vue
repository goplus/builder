<template>
  <UIFormModal
    style="width: 512px"
    :title="$t({ en: 'Remove animation', zh: '移除动画' })"
    :visible="visible"
    @update:visible="emit('cancel')"
  >
    <div>
      <div>
        {{
          $t({
            en: `Animation ${animation.name} will be removed. Do you want to preserve the costumes?`,
            zh: `动画 ${animation.name} 将被移除。是否保留其中的造型？`
          })
        }}
      </div>
      <UICheckbox v-model:checked="preserveCostumes">
        {{
          $t({
            en: "Preserve (the costumes will be moved to the sprite's costume list)",
            zh: '保留（造型将被移动到角色的造型列表中）'
          })
        }}
      </UICheckbox>
    </div>
    <div class="action">
      <UIButton type="boring" @click="emit('cancel')">
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton type="primary" @click="handleConfirm">
        {{ $t({ en: 'Confirm', zh: '确认' }) }}
      </UIButton>
    </div>
  </UIFormModal>
</template>
<script setup lang="ts">
import { UIButton, UICheckbox, UIFormModal } from '@/components/ui'
import type { Animation } from '@/models/animation'

import { defineProps, defineEmits, ref } from 'vue'

defineProps<{
  visible: boolean
  animation: Animation
}>()
const emit = defineEmits<{
  cancel: []
}>()

const preserveCostumes = ref(false)

const handleConfirm = () => {
  // TODO
}
</script>
<style scoped lang="scss">
.action {
  margin-top: 40px;
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
}
</style>
