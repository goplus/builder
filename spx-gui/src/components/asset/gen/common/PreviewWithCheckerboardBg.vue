<!--
  Preview component with a checkerboard background.
  Typically used in costume / animation gen UI within sprite gen.
-->

<script setup lang="ts">
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'
</script>

<template>
  <div class="relative flex-1 overflow-hidden rounded-1 w-full">
    <CheckerboardBackground class="absolute inset-0" />
    <slot>
      <div class="relative flex h-full w-full items-center justify-center text-hint-2">
        {{
          $t({
            en: 'Enter details in the lower-left box and click "Generate".',
            zh: '请在左下方描述细节，然后点击“生成”。'
          })
        }}
      </div>
    </slot>
  </div>
</template>
