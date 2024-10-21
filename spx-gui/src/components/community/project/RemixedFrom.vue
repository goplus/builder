<script setup lang="ts">
import { computed } from 'vue'
import { parseRemixSource, stringifyRemixSource } from '@/apis/project'
import { getProjectPageRoute } from '@/router'

const props = defineProps<{
  remixedFrom: string
}>()

const remixedFrom = computed(() => parseRemixSource(props.remixedFrom))
</script>

<template>
  <p class="remixed-from">
    {{ $t({ en: 'Remixed from', zh: '改编自' }) }}
    <RouterLink class="link" :to="getProjectPageRoute(remixedFrom.owner, remixedFrom.project)">
      {{ stringifyRemixSource(remixedFrom.owner, remixedFrom.project) }}
    </RouterLink>
  </p>
</template>

<style lang="scss" scoped>
.link {
  // TODO: extract to `@/components/ui/`?
  color: inherit;
  text-decoration: underline;
  &:hover {
    color: var(--ui-color-primary-main);
  }
  &:active {
    color: var(--ui-color-primary-600);
  }
}
</style>
