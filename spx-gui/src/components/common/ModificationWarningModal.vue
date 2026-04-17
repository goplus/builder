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
    <div class="flex flex-col gap-2 text-base/[1.6] text-grey-800">
      <div class="flex items-center gap-2 font-semibold text-yellow-500">
        <span
          class="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-yellow-500 text-base font-bold leading-none text-grey-100"
        >
          !
        </span>
        <span>{{ $t(props.tip) }}</span>
      </div>
      <ul class="m-0 list-none flex flex-col gap-0.5 pl-0 text-grey-800">
        <li v-for="(item, index) in props.items" :key="index">
          {{ $t(item) }}
        </li>
      </ul>
    </div>
    <footer class="mt-6 flex justify-center gap-xl pb-1">
      <UIButton v-radar="props.confirmRadar" type="red" @click="emit('resolved')">
        {{ $t(props.confirmText) }}
      </UIButton>
    </footer>
  </UIFormModal>
</template>
