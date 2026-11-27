<script lang="ts">
import type { LocaleMessage } from '@/utils/i18n'

export type SoundParamOption<T> = {
  value: T
  label: LocaleMessage
}
</script>

<script setup lang="ts" generic="T">
import { computed, inject } from 'vue'
import { useI18n } from '@/utils/i18n'
import { UIDropdownWithTooltip } from '@/components/ui'
import { settingsInputCtxKey } from '../common/SettingsInput.vue'
import SoundParamOptionItem from './SoundParamOption.vue'

const props = withDefaults(
  defineProps<{
    name: LocaleMessage
    tips: LocaleMessage
    options: Array<SoundParamOption<T>>
    value?: T | null
    placeholderLabel?: LocaleMessage | null
    clearable?: boolean
    disabled?: boolean
    playingValue?: T | null
    playingProgress?: number
    playOption?: ((value: T) => Promise<void>) | null
  }>(),
  {
    value: null,
    placeholderLabel: null,
    clearable: false,
    disabled: false,
    playingValue: null,
    playingProgress: 0,
    playOption: null
  }
)

const emit = defineEmits<{
  'update:value': [value: T | null]
  stopPreview: []
  popoverClose: []
}>()

const { t } = useI18n()

const settingsInputCtx = inject(settingsInputCtxKey, null)
const effectiveDisabled = computed(
  () => props.disabled || (settingsInputCtx != null && (settingsInputCtx.disabled || settingsInputCtx.readonly))
)
const iconOnly = computed(() => settingsInputCtx?.iconOnly ?? false)

const selectedOption = computed(() => props.options.find((item) => item.value === props.value) ?? null)
const triggerLabel = computed(() => selectedOption.value?.label ?? props.placeholderLabel ?? props.name)

const tooltipText = computed(() => {
  if (selectedOption.value != null) {
    return {
      en: `${props.name.en}: ${selectedOption.value.label.en}`,
      zh: `${props.name.zh}： ${selectedOption.value.label.zh}`
    }
  }
  return props.name
})

const optionsText = computed(() => props.options.map((item) => t(item.label)).join(', '))
</script>

<template>
  <UIDropdownWithTooltip
    class="rounded-lg"
    :disabled="effectiveDisabled"
    placement="top"
    @update:visible="(v) => !v && emit('popoverClose')"
  >
    <template #trigger>
      <button
        v-radar="{
          name: 'param-selector',
          label: `Param selector &quot;${$t(name)}&quot;`,
          desc: `Click to select '${$t(name)}' (e.g., ${optionsText})`,
          attrs: { name: name.en }
        }"
        type="button"
        class="h-8 flex items-center justify-center gap-1 rounded-md border border-grey-400 bg-grey-100 pr-2.5 pl-1.5 text-sm text-grey-900 cursor-pointer hover:bg-grey-300 disabled:cursor-not-allowed disabled:bg-grey-300 disabled:text-grey-600"
        :class="{ 'aspect-square px-0!': iconOnly }"
        :disabled="effectiveDisabled"
      >
        <span
          class="flex h-5 w-5 flex-none items-center justify-center"
          :class="effectiveDisabled ? 'text-grey-600' : 'text-grey-900'"
        >
          <slot name="icon"></slot>
        </span>
        <span v-if="!iconOnly" class="whitespace-nowrap">{{ $t(triggerLabel) }}</span>
      </button>
    </template>
    <template #tooltip-content>
      {{ $t(tooltipText) }}
    </template>
    <template #dropdown-content>
      <div class="max-w-102 flex flex-col gap-3 p-4">
        <div>{{ $t(tips) }}</div>
        <ul class="m-0 list-none flex flex-row flex-wrap gap-2 p-0">
          <li v-for="(item, index) in options" :key="index">
            <SoundParamOptionItem
              v-radar="{
                name: 'param-option',
                label: `Param option &quot;${$t(item.label)}&quot;`,
                desc: `Select '${$t(item.label)}' as the '${$t(name)}'`,
                attrs: { name: item.label.en }
              }"
              :active="value === item.value"
              :label="$t(item.label)"
              :clearable="clearable"
              :playing="playOption != null && playingValue === item.value"
              :progress="playOption != null && playingValue === item.value ? playingProgress : 0"
              :play="playOption != null ? () => playOption!(item.value) : null"
              @select="emit('update:value', clearable && value === item.value ? null : item.value)"
              @clear="emit('update:value', null)"
              @stop="emit('stopPreview')"
            />
          </li>
        </ul>
      </div>
    </template>
  </UIDropdownWithTooltip>
</template>
