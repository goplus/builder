<script lang="ts" setup>
import { UIButton, UIImg, UITooltip } from '@/components/ui'

defineProps<{
  reference: string
}>()
</script>

<template>
  <UITooltip>
    <template #trigger>
      <UIButton variant="stroke" color="boring">
        <template #icon>
          <UIImg :src="reference" />
        </template>
      </UIButton>
    </template>
    <div></div>
  </UITooltip>
</template>

<style lang="scss" scoped></style>
