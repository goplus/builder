<script lang="ts" setup>
import { UIIcon, type IconType } from '@/components/ui'
import { useSlots } from 'vue'

defineProps<{ icon?: IconType }>()

const slots = useSlots()
</script>

<template>
  <div
    class="group h-8 w-8 cursor-pointer flex items-center justify-center rounded-[10px] text-center hover:bg-turquoise-200"
  >
    <UIIcon
      v-if="slots.default == null && icon != null"
      class="text-grey-1000 group-hover:text-turquoise-500"
      :type="icon"
    />
    <slot v-else></slot>
  </div>
</template>
