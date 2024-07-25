<template>
  <div>
    <UITooltip>
      <template #trigger>
        <div class="mute-switch-button">
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
<style scoped lang="scss">
.mute-switch-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s;
  border: 1px solid var(--ui-color-grey-500);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;

  &:hover {
    background-color: var(--ui-color-grey-300);
  }
}
</style>
