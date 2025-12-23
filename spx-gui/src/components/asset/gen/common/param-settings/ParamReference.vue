<script lang="ts" setup>
import { UIButton, UIImg, UITooltip } from '@/components/ui'
import type { ParamSettingProps } from './ParamsSettings.vue'

defineProps<ParamSettingProps<string>>()
</script>

<template>
  <UITooltip>
    <template #trigger>
      <UIButton variant="stroke" color="boring">
        <template #icon>
          <UIImg :src="value" />
        </template>
      </UIButton>
    </template>
    {{ $t(tips) }}
  </UITooltip>
</template>

<style lang="scss" scoped></style>
