<script lang="ts" setup>
import type { CourseSeries } from '@/apis/course-series'
import { UIDropdown, UIIcon, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'

defineProps<{
  courseSeries: CourseSeries
}>()

const emit = defineEmits<{
  edit: []
  remove: []
}>()
</script>

<template>
  <UIDropdown trigger="click" placement="bottom-end">
    <template #trigger>
      <div class="corner-menu" @click.stop.prevent>
        <UIIcon class="icon" type="more" />
      </div>
    </template>
    <UIMenu>
      <UIMenuGroup>
        <UIMenuItem @click="emit('edit')">
          {{ $t({ en: 'Edit', zh: '编辑' }) }}
        </UIMenuItem>
      </UIMenuGroup>

      <UIMenuGroup>
        <UIMenuItem @click="emit('remove')">
          {{ $t({ en: 'Remove', zh: '删除' }) }}
        </UIMenuItem>
      </UIMenuGroup>
    </UIMenu>
  </UIDropdown>
</template>

<style lang="scss" scoped>
.corner-menu {
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  color: var(--ui-color-grey-800);
  background-color: var(--ui-color-grey-100);
  cursor: pointer;
  transition: 0.1s;

  &:hover {
    color: var(--ui-color-grey-100);
    background-color: var(--ui-color-primary-main);
  }

  .icon {
    width: 21px;
    height: 21px;
  }
}
</style>
