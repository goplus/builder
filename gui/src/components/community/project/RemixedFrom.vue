<script setup lang="ts">
import { computed } from 'vue'
import { parseRemixSource } from '@/apis/project'
import { getProjectPageRoute, getUserPageRoute } from '@/apps/xbuilder/router'
import { useUser } from '@/stores/user'
import RouterUILink from '@/components/common/RouterUILink.vue'

const props = defineProps<{
  remixedFrom: string
}>()

const remixedFrom = computed(() => parseRemixSource(props.remixedFrom))
const { data: owner } = useUser(() => remixedFrom.value.owner)
</script>

<template>
  <p class="remixed-from">
    {{ $t({ en: 'Remixed from', zh: '改编自' }) }}
    <RouterUILink
      v-radar="{ name: 'remixed-from-owner-link', desc: 'Click to view the original creator’s profile' }"
      :to="getUserPageRoute(remixedFrom.owner)"
      type="boring"
    >
      {{ owner?.displayName ?? remixedFrom.owner }}
    </RouterUILink>
    /
    <RouterUILink
      v-radar="{ name: 'remixed-from-link', desc: 'Click to view the original project' }"
      :to="getProjectPageRoute(remixedFrom.owner, remixedFrom.project)"
      type="boring"
    >
      {{ remixedFrom.project }}
    </RouterUILink>
  </p>
</template>
