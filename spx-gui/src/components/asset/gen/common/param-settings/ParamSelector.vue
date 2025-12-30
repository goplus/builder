<script lang="ts" setup generic="T">
import { UIBlockItem, UIBlockItemTitle, UIButton, UIDropdownWithTooltip, UIImg } from '@/components/ui'
import type { LocaleMessage } from '@/utils/i18n'
import { computed, inject } from 'vue'
import { iconOnlyKey } from '../SettingsInput.vue'

type Option = { value: T; label: LocaleMessage; image?: string; tips?: LocaleMessage }

const props = withDefaults(
  defineProps<{
    value: T
    tips: LocaleMessage
    options: Array<Option>
    disabled?: boolean
    placeholder?: false | Omit<Option, 'value'>
  }>(),
  {
    placeholder: false,
    disabled: true
  }
)

defineEmits<{
  'update:value': [value: T]
}>()

const selectedItem = computed(() => {
  if (props.placeholder) return props.placeholder
  return props.options.find((item) => item.value === props.value)
})

const iconOnly = inject(iconOnlyKey)
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
      <UIButton :key="String(iconOnly)" :disabled="disabled" variant="stroke" color="boring">
        <template v-if="selectedItem.image != null" #icon>
          <UIImg
            class="image"
            :style="{ backgroundSize: iconOnly && !placeholder ? '130%' : '110%' }"
            :class="[placeholder ? 'placeholder-image' : 'button-image', { disabled }]"
            :src="selectedItem.image"
          />
        </template>
        <template v-if="!iconOnly" #default>
          {{ $t(selectedItem.label) }}
        </template>
      </UIButton>
    </template>
    <template v-if="selectedItem != null" #tooltip-content>
      {{ $t(selectedItem.tips != null ? selectedItem.tips : selectedItem.label) }}
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
