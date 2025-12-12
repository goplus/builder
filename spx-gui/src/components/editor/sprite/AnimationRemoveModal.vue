<template>
  <UIFormModal
    :radar="{ name: 'Animation remove modal', desc: 'Modal for removing animations' }"
    style="width: 560px"
    :title="$t({ en: 'Remove animation', zh: '删除动画' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <div>
      <div>
        {{
          $t({
            en: `Animation ${animation.name} will be removed. Do you want to preserve the costumes?`,
            zh: `动画 ${animation.name} 将被删除。是否保留其中的造型？`
          })
        }}
      </div>
      <UICheckbox v-model:checked="preserveCostumes" class="checkbox">
        {{
          $t({
            en: "Preserve (the costumes will be moved to the sprite's costume list)",
            zh: '保留（造型将被移动到精灵的造型列表中）'
          })
        }}
      </UICheckbox>
    </div>
    <div class="action">
      <UIButton
        v-radar="{ name: 'Cancel button', desc: 'Click to cancel removing animation' }"
        color="boring"
        @click="emit('cancelled')"
      >
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'Confirm button', desc: 'Click to confirm removing animation' }"
        color="primary"
        @click="handleConfirm"
      >
        {{ $t({ en: 'Confirm', zh: '确认' }) }}
      </UIButton>
    </div>
  </UIFormModal>
</template>
<script setup lang="ts">
import { UIButton, UICheckbox, UIFormModal } from '@/components/ui'
import type { Animation } from '@/models/animation'
import type { Project } from '@/models/project'

import { ref } from 'vue'

const props = defineProps<{
  visible: boolean
  animation: Animation
  project: Project
}>()
const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const preserveCostumes = ref(false)

const handleConfirm = async () => {
  const sprite = props.animation.sprite
  if (sprite == null) throw new Error('sprite not found')
  await props.project.history.doAction(
    {
      name: {
        en: `Remove animation ${props.animation.name}`,
        zh: `删除动画 ${props.animation.name}`
      }
    },
    () => {
      sprite.removeAnimation(props.animation.id)
      if (preserveCostumes.value) {
        for (const costume of props.animation.costumes) {
          const clonedCostume = costume.clone()
          sprite.addCostume(clonedCostume)
        }
      }
    }
  )
  emit('resolved')
}
</script>
<style scoped lang="scss">
.checkbox {
  margin-top: 20px;
}
.action {
  margin-top: 40px;
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
}
</style>
