<script lang="ts" setup generic="T">
import { computed, inject } from 'vue'
import { UIBlockItem, UIBlockItemTitle, UICornerIcon, UIDropdownWithTooltip, UIImg } from '@/components/ui'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { settingsInputCtxKey } from '../SettingsInput.vue'

type Option = { value: T; label: LocaleMessage; image?: string }

const props = withDefaults(
  defineProps<{
    name: LocaleMessage
    value?: T | null
    tips: LocaleMessage
    options: Array<Option>
    placeholder?: null | Omit<Option, 'value'>
    clearable?: boolean
  }>(),
  {
    value: null,
    placeholder: null,
    clearable: true
  }
)

defineEmits<{
  'update:value': [value: T | null]
}>()

const { t } = useI18n()

const showPlaceholder = computed(() => props.value == null && props.placeholder != null)
const selectedItem = computed(() => {
  if (showPlaceholder.value) return props.placeholder
  return props.options.find((item) => item.value === props.value)
})

const tooltipText = computed(() => {
  if (selectedItem.value != null)
    return showPlaceholder.value
      ? selectedItem.value.label
      : {
          en: `${props.name.en}: ${selectedItem.value.label.en}`,
          zh: `${props.name.zh}： ${selectedItem.value.label.zh}`
        }
  return props.name
})

const optionsText = computed(() => props.options.map((item) => t(item.label)).join(', '))

const settingsInputCtx = inject(settingsInputCtxKey)
if (settingsInputCtx == null) throw new Error('settingsInputCtxKey should be provided')

const disabled = computed(() => settingsInputCtx.disabled || settingsInputCtx.readonly)
const iconOnly = computed(() => settingsInputCtx.iconOnly)
</script>

<template>
  <UIDropdownWithTooltip :disabled="disabled" placement="top">
    <template v-if="selectedItem != null" #trigger>
      <!-- TODO: Standardize this button variant once the design system specification is finalized. -->
      <button
        v-radar="{
          name: $t(name),
          desc: `Click to select '${$t(name)}' (e.g., ${optionsText})`
        }"
        class="h-8 flex items-center justify-center gap-1 rounded-2 border border-grey-400 bg-grey-100 pr-2 pl-1 text-13/5 text-grey-900 cursor-pointer hover:bg-grey-300 disabled:cursor-not-allowed disabled:bg-grey-300 disabled:text-grey-600"
        :class="[{ 'aspect-square px-0': iconOnly }]"
        :disabled="disabled"
      >
        <UIImg
          v-if="selectedItem.image != null"
          :class="['h-6 w-6 rounded-[10px]', { 'opacity-40': disabled, 'disabled-like': disabled && showPlaceholder }]"
          :src="selectedItem.image"
          size="cover"
        />
        <template v-if="!iconOnly">
          {{ $t(selectedItem.label) }}
        </template>
      </button>
    </template>
    <template v-if="tooltipText != null" #tooltip-content>
      {{ $t(tooltipText) }}
    </template>
    <template #dropdown-content>
      <div class="max-w-102 flex flex-col gap-3 p-4">
        <div>{{ $t(tips) }}</div>
        <ul class="flex flex-row flex-wrap gap-2">
          <UIBlockItem
            v-for="(item, index) in options"
            :key="index"
            v-radar="{
              name: `Option '${$t(item.label)}'`,
              desc: `Select '${$t(item.label)}' as the '${$t(name)}'`
            }"
            :active="value === item.value"
            @click="$emit('update:value', clearable && value === item.value ? null : item.value)"
          >
            <UIImg v-if="item.image != null" class="mt-0.5 mb-1 h-15 w-20 rounded-1" :src="item.image" />
            <UIBlockItemTitle size="medium">
              {{ $t(item.label) }}
            </UIBlockItemTitle>
            <UICornerIcon
              v-show="clearable && value === item.value"
              type="minus"
              @click.stop.prevent="$emit('update:value', null)"
            />
          </UIBlockItem>
        </ul>
      </div>
    </template>
  </UIDropdownWithTooltip>
</template>

<style scoped>
.disabled-like {
  /* TODO: Temporarily simulate the color value of --ui-color-grey-600 via filter,
     because the placeholder's background-image is an SVG and its color cannot be set directly. */
  filter: invert(96%) sepia(11%) saturate(163%) hue-rotate(169deg) brightness(91%) contrast(88%);
}
</style>
