<script lang="ts" setup generic="T">
import { UIBlockItem, UIBlockItemTitle, UIButton, UIDropdownWithTooltip, UIImg } from '@/components/ui'
import type { LocaleMessage } from '@/utils/i18n'
import { computed, inject } from 'vue'
import { settingInputCtxKey } from '../SettingsInput.vue'

type Option = { value: T; label: LocaleMessage; image?: string }

const props = withDefaults(
  defineProps<{
    name?: LocaleMessage | null
    value: T
    tips: LocaleMessage
    options: Array<Option>
    placeholder?: null | Omit<Option, 'value'>
  }>(),
  {
    name: null,
    placeholder: null
  }
)

defineEmits<{
  'update:value': [value: T]
}>()

const selectedItem = computed(() => {
  if (props.placeholder != null) return props.placeholder
  return props.options.find((item) => item.value === props.value)
})

const tooltipText = computed(() => {
  if (props.placeholder != null) return props.placeholder.label
  if (props.name != null && selectedItem.value != null)
    return {
      en: `${props.name.en}: ${selectedItem.value.label.en}`,
      zh: `${props.name.zh}： ${selectedItem.value.label.zh}`
    }
  return selectedItem.value?.label
})

const settingInputCtx = inject(settingInputCtxKey)
if (settingInputCtx == null) throw new Error('settingInputCtxKey should be provided')
</script>

<template>
  <UIDropdownWithTooltip :disabled="settingInputCtx.disabled" placement="top">
    <template v-if="selectedItem != null" #trigger>
      <!-- The button margin is a bit large, need to consider how to be compatible with the specifications -->
      <!-- 
        Temporary: Vue includes comment nodes in slots when using v-if, 
        which prevents 'slots.default' from being null. 
        The :key forces UIButton to re-mount and correctly recalculate its icon-only state.
      -->
      <UIButton
        :key="String(settingInputCtx.iconOnly)"
        :disabled="settingInputCtx.disabled"
        variant="stroke"
        color="boring"
      >
        <template v-if="selectedItem.image != null" #icon>
          <UIImg
            class="image"
            :style="{ backgroundSize: settingInputCtx.iconOnly && placeholder != null ? '130%' : '110%' }"
            :class="[
              placeholder != null ? 'placeholder-image' : 'button-image',
              { disabled: settingInputCtx.disabled }
            ]"
            :src="selectedItem.image"
          />
        </template>
        <template v-if="!settingInputCtx.iconOnly" #default>
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
        <ul class="params-list">
          <UIBlockItem
            v-for="(item, index) in options"
            :key="index"
            :active="value === item.value"
            @click="$emit('update:value', item.value)"
          >
            <UIImg v-if="item.image != null" class="block-image" :src="item.image" />
            <UIBlockItemTitle size="medium">
              {{ $t(item.label) }}
            </UIBlockItemTitle>
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
  margin-bottom: 5px;
}

.dropdown-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  max-width: 408px;

  .params-list {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
