<script lang="ts">
type Item<T> = {
  value: T
  label: LocaleMessage
  image?: string
}
</script>

<script lang="ts" setup generic="T">
import { UIBlockItem, UIBlockItemTitle, UIButton, UIDropdownWithTooltip, UIImg } from '@/components/ui'
import type { LocaleMessage } from '@/utils/i18n'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: T
    options: Item<T>[]
    tips: LocaleMessage
    onlyIcon?: boolean
  }>(),
  {
    onlyIcon: false
  }
)

defineEmits<{
  'update:value': [value: T]
}>()

const selectedItem = computed(() => props.options.find((item) => item.value === props.value))
</script>

<template>
  <UIDropdownWithTooltip placement="top">
    <template #trigger>
      <UIButton variant="stroke" color="boring">
        <template v-if="selectedItem?.image != null" #icon>
          <UIImg :src="selectedItem.image" />
        </template>
        <template v-if="selectedItem?.image == null || !onlyIcon">
          {{ selectedItem?.label != null ? $t(selectedItem.label) : '' }}
        </template>
      </UIButton>
    </template>
    <template #tooltip-content>
      {{ selectedItem?.label != null ? $t(selectedItem.label) : '' }}
    </template>
    <template #dropdown-content>
      <div class="dropdown-content">
        <div>{{ $t(tips) }}</div>
        <ul class="params-list">
          <UIBlockItem
            v-for="item in options"
            :key="item.value"
            :active="value === item.value"
            @click="$emit('update:value', item.value)"
          >
            <UIImg v-if="item.image != null" :src="item.image" />
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
