<template>
  <div>
    <UITooltip>
      <template #trigger>
        <div
          class="cursor-pointer flex h-8 w-8 items-center justify-center rounded-full border border-grey-500 bg-white transition-colors hover:bg-grey-300"
        >
          <UIIcon :type="muted ? 'volumeOff' : 'volumeUp'" />
        </div>
      </template>
      <template #default>
        <div>
          {{ $t({ en: 'Turn on/off sound', zh: '开启/关闭声音' }) }}
        </div>
      </template>
    </UITooltip>
  </div>
</template>
<script setup lang="ts">
import { UIIcon, UITooltip } from '@/components/ui'

defineProps<{
  muted: boolean
}>()
</script>
