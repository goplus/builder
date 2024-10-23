<script setup lang="ts">
import { computed } from 'vue'
import { parseRemixSource, stringifyRemixSource } from '@/apis/project'
import { getProjectPageRoute } from '@/router'
import RouterUILink from '@/components/common/RouterUILink.vue'

const props = defineProps<{
  remixedFrom: string
}>()

const remixedFrom = computed(() => parseRemixSource(props.remixedFrom))
</script>

<template>
  <p class="remixed-from">
    {{ $t({ en: 'Remixed from', zh: '改编自' }) }}
    <RouterUILink :to="getProjectPageRoute(remixedFrom.owner, remixedFrom.project)" type="boring">
      {{ stringifyRemixSource(remixedFrom.owner, remixedFrom.project) }}
    </RouterUILink>
  </p>
</template>
