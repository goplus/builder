<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { UIButton, UIFormModal } from '@/components/ui'
import type { LocaleMessage } from '@/utils/i18n'
import type { RadarNodeMeta } from '@/utils/radar'

const props = withDefaults(
  defineProps<{
    title: LocaleMessage
    tip: LocaleMessage
    items: LocaleMessage[]
    confirmText: LocaleMessage
    visible: boolean
    radar: RadarNodeMeta
    confirmRadar: RadarNodeMeta
    modalStyle?: CSSProperties
  }>(),
  {
    modalStyle: () => ({})
  }
)

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

function handleCancel() {
  emit('cancelled')
}
</script>

<template>
  <UIFormModal
    :radar="props.radar"
    :title="$t(props.title)"
    :style="props.modalStyle"
    :visible="props.visible"
    :mask-closable="false"
    @update:visible="handleCancel"
  >
    <div class="warn-content">
      <div class="warn-tip">
        <span class="warn-tip-icon">!</span>
        <span>{{ $t(props.tip) }}</span>
      </div>
      <ul class="warn-lines">
        <li v-for="(item, index) in props.items" :key="index">
          {{ $t(item) }}
        </li>
      </ul>
    </div>
    <footer class="footer center">
      <UIButton v-radar="props.confirmRadar" color="danger" @click="emit('resolved')">
        {{ $t(props.confirmText) }}
      </UIButton>
    </footer>
  </UIFormModal>
</template>

<style scoped lang="scss">
.warn-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--ui-color-grey-800);
  font-size: 14px;
  line-height: 1.6;
}

.warn-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ui-color-yellow-500);
  font-weight: 600;
}

.warn-tip-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--ui-color-yellow-500);
  color: var(--ui-color-grey-100);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-size: 14px;
  font-weight: 700;
  flex: 0 0 auto;
}

.warn-lines {
  margin: 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--ui-color-grey-800);
}

.footer {
  display: flex;
  gap: var(--ui-gap-middle);
  margin-top: var(--ui-gap-large);
  padding-bottom: 4px;
}

.center {
  justify-content: center;
}
</style>
