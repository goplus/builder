<script lang="ts" setup>
import { computed, inject } from 'vue'
import { UIButton, UIImg, UITooltip } from '@/components/ui'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import type { LocaleMessage } from '@/utils/i18n'
import { useAsyncComputed } from '@/utils/utils'
import { settingsInputCtxKey } from '../SettingsInput.vue'

const props = defineProps<{
  value: string
  tips: LocaleMessage
}>()

const file = useAsyncComputed(async (onCleanup) => {
  const file = await createFileWithUniversalUrl(props.value)
  return file.url(onCleanup)
})

const settingsInputCtx = inject(settingsInputCtxKey)
if (settingsInputCtx == null) throw new Error('settingsInputCtxKey should be provided')

const disabled = computed(() => settingsInputCtx.disabled || settingsInputCtx.readonly)
</script>

<template>
  <UITooltip>
    <template #trigger>
      <UIButton variant="stroke" color="boring" :disabled="disabled">
        <template #icon>
          <UIImg :class="{ disabled }" class="reference-image" :src="file" />
        </template>
      </UIButton>
    </template>
    {{ $t(tips) }}
  </UITooltip>
</template>

<style lang="scss" scoped>
.reference-image {
  width: 22px;
  height: 22px;

  &.disabled {
    opacity: 0.5;
  }
}
</style>
