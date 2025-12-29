<script lang="ts" setup>
import { UIButton, UIImg, UITooltip } from '@/components/ui'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import type { LocaleMessage } from '@/utils/i18n'
import { useAsyncComputed } from '@/utils/utils'

const props = defineProps<{
  value: string
  tips: LocaleMessage
}>()

const file = useAsyncComputed(async (onCleanup) => {
  const file = await createFileWithUniversalUrl(props.value)
  return file.url(onCleanup)
})
</script>

<template>
  <UITooltip>
    <template #trigger>
      <UIButton variant="stroke" color="boring">
        <template #icon>
          <UIImg class="reference-image" :src="file" />
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
}
</style>
