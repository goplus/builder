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
        class="param-button"
        :class="[{ 'icon-only': iconOnly }]"
        :disabled="disabled"
      >
        <UIImg
          v-if="selectedItem.image != null"
          :style="{ backgroundSize: iconOnly && showPlaceholder ? '130%' : '110%' }"
          :class="[showPlaceholder ? 'placeholder-image' : 'button-image', { disabled }]"
          :src="selectedItem.image"
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
      <div class="dropdown-content">
        <div>{{ $t(tips) }}</div>
        <ul class="options">
          <UIBlockItem
            v-for="(item, index) in options"
            :key="index"
            v-radar="{
              name: `Option '${$t(item.label)}'`,
              desc: `Select '${$t(item.label)}' as the '${$t(name)}'`
            }"
            class="option"
            :active="value === item.value"
            @click="$emit('update:value', clearable && value === item.value ? null : item.value)"
          >
            <UIImg v-if="item.image != null" class="block-image" :src="item.image" />
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

<style lang="scss" scoped>
.placeholder-image {
  width: 16px;
  height: 16px;
}

.param-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 32px;
  font-size: 13px;
  padding: 0 8px;

  border-radius: var(--ui-border-radius-2);
  border: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);

  &.icon-only {
    aspect-ratio: 1;
    padding: 0;
  }

  &:hover:not(:active, :disabled) {
    cursor: pointer;
    background: var(--ui-color-grey-300);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.button-image {
  width: 26px;
  height: 26px;
  border-radius: 10px;

  &.disabled {
    opacity: 0.5;
  }
}

.block-image {
  width: 80px;
  height: 60px;
  border-radius: 10px;
  margin-bottom: 5px;
}

.dropdown-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  max-width: 408px;

  .options {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
