<script lang="ts" setup>
import { getUnitLabel } from '@/components/tutorials/units'
import { UIButton, UIDropdown, UIIcon, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'

defineProps<{
  unitIndex: number
  title: string
  courseCount: number
  /** Whether the unit can be moved earlier, or later. */
  canMoveUp: boolean
  canMoveDown: boolean
  /** Whether the unit is being edited, which then waits. */
  disabled: boolean
}>()

const emit = defineEmits<{
  createCourse: []
  rename: []
  moveUp: []
  moveDown: []
  remove: []
}>()
</script>

<template>
  <li
    v-radar="{ name: 'unit-header', desc: 'Header of a unit, whose courses follow it', attrs: { name: title } }"
    class="flex w-full items-center gap-3 border-b border-dividing-line-2 pb-2 pt-4 first:pt-0"
  >
    <span class="flex-none rounded-sm bg-primary-200 px-2 text-sm/6 text-primary-main">
      {{ $t(getUnitLabel(unitIndex)) }}
    </span>
    <h3 class="m-0 min-w-0 truncate text-lg text-title">{{ title }}</h3>
    <span class="flex-none text-sm text-grey-800">
      {{ $t({ en: `${courseCount} course${courseCount === 1 ? '' : 's'}`, zh: `${courseCount} 门课程` }) }}
    </span>
    <div class="ml-auto flex flex-none items-center gap-2">
      <UIButton
        v-radar="{ name: 'create-course-in-unit-button', desc: 'Click to create a course at the end of the unit' }"
        type="neutral"
        size="small"
        :disabled="disabled"
        @click="emit('createCourse')"
      >
        <template #icon><UIIcon type="plus" /></template>
        {{ $t({ en: 'Create course', zh: '新建课程' }) }}
      </UIButton>
      <UIDropdown trigger="click" placement="bottom-end">
        <template #trigger>
          <UIButton
            v-radar="{ name: 'unit-menu', desc: 'Click to open the actions for the unit' }"
            type="neutral"
            size="small"
            shape="circle"
            icon="more"
            :disabled="disabled"
          />
        </template>
        <UIMenu>
          <UIMenuGroup>
            <UIMenuItem @click="emit('rename')">{{ $t({ en: 'Rename', zh: '重命名' }) }}</UIMenuItem>
            <UIMenuItem :disabled="!canMoveUp" @click="emit('moveUp')">
              {{ $t({ en: 'Move up', zh: '上移' }) }}
            </UIMenuItem>
            <UIMenuItem :disabled="!canMoveDown" @click="emit('moveDown')">
              {{ $t({ en: 'Move down', zh: '下移' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup>
            <UIMenuItem @click="emit('remove')">{{ $t({ en: 'Delete unit', zh: '删除单元' }) }}</UIMenuItem>
          </UIMenuGroup>
        </UIMenu>
      </UIDropdown>
    </div>
  </li>
</template>
