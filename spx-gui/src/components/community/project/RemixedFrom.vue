<script setup lang="ts">
import { computed } from 'vue'
import { parseRemixSource } from '@/apis/project'
import { getProjectPageRoute } from '@/router'
import { useUser } from '@/stores/user'
import RouterUILink from '@/components/common/RouterUILink.vue'

const props = defineProps<{
  remixedFrom: string
}>()

const remixedFrom = computed(() => parseRemixSource(props.remixedFrom))
const { data: owner } = useUser(() => remixedFrom.value.owner)
const title = computed(() => {
  if (owner.value == null) return null
  return {
    en: `${remixedFrom.value.project} created by ${owner.value.displayName}`,
    zh: `${remixedFrom.value.project}，由 ${owner.value.displayName} 创建`
  }
})
</script>

<template>
  <p class="remixed-from">
    {{ $t({ en: 'Remixed from', zh: '改编自' }) }}
    <RouterUILink
      v-radar="{ name: 'Remixed from link', desc: 'Click to view the original project' }"
      :to="getProjectPageRoute(remixedFrom.owner, remixedFrom.project)"
      type="boring"
      :title="$t(title)"
    >
      {{ remixedFrom.project }}
    </RouterUILink>
  </p>
</template>
