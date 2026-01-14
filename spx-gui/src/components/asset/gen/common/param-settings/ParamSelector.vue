<script lang="ts" setup generic="T">
import { computed, inject } from 'vue'
import { UIBlockItem, UIBlockItemTitle, UIButton, UICornerIcon, UIDropdownWithTooltip, UIImg } from '@/components/ui'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { settingsInputCtxKey } from '../SettingsInput.vue'

type Option = { value: T; label: LocaleMessage; image?: string }

const props = withDefaults(
  defineProps<{
    name?: LocaleMessage | null
    value?: T | null
    tips: LocaleMessage
    options: Array<Option>
    placeholder?: null | Omit<Option, 'value'>
    clearable?: boolean
  }>(),
  {
    name: null,
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
  if (props.name != null && selectedItem.value != null)
    return showPlaceholder.value
      ? selectedItem.value.label
      : {
          en: `${props.name.en}: ${selectedItem.value.label.en}`,
          zh: `${props.name.zh}： ${selectedItem.value.label.zh}`
        }
  return selectedItem.value?.label
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
      <!-- The button margin is a bit large, need to consider how to be compatible with the specifications -->
      <!-- 
        Temporary: Vue includes comment nodes in slots when using v-if, 
        which prevents 'slots.default' from being null. 
        The :key forces UIButton to re-mount and correctly recalculate its icon-only state.
      -->
      <UIButton
        :key="String(iconOnly)"
        v-radar="{
          name: name !== null ? $t(name) : 'Param selector',
          desc: `Click to select ${name !== null ? $t(name) : 'parameter'} (e.g., ${optionsText})`
        }"
        :disabled="disabled"
        variant="stroke"
        color="boring"
      >
        <template v-if="selectedItem.image != null" #icon>
          <UIImg
            class="image"
            :style="{ backgroundSize: iconOnly && showPlaceholder ? '130%' : '110%' }"
            :class="[showPlaceholder ? 'placeholder-image' : 'button-image', { disabled }]"
            :src="selectedItem.image"
          />
        </template>
        <template v-if="!iconOnly" #default>
          {{ $t(selectedItem.label) }}
        </template>
      </UIButton>
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
              desc: `Select '${$t(item.label)}' as the ${name !== null ? $t(name) : 'parameter'}`
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
