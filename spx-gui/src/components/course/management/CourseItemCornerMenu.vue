<script lang="ts" setup>
import type { Course } from '@/apis/course'
import { UIDropdown, UIIcon, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'

defineProps<{
  course: Course
}>()

const emit = defineEmits<{
  edit: []
  remove: []
}>()
</script>

<template>
  <UIDropdown trigger="click" placement="bottom-end">
    <template #trigger>
      <div
        class="corner-menu flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-grey-100 text-grey-800 transition-all duration-100 hover:bg-primary-main hover:text-grey-100"
        @click.stop.prevent
      >
        <UIIcon class="w-5.25 h-5.25" type="more" />
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
