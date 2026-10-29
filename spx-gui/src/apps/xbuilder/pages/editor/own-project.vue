<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { UILoading } from '@/components/ui'
import { useSignedIn } from '@/stores/user'
import { getProjectEditorRoute } from '../../router'

const props = defineProps<{
  projectNameInput: string
}>()

const route = useRoute()
const router = useRouter()
const signedIn = useSignedIn()

onMounted(() => {
  const username = signedIn.username
  if (username == null) {
    signedIn.signIn(route.fullPath)
    return
  }
  router.replace(getProjectEditorRoute(username, props.projectNameInput, route.query.publish != null))
})
</script>

<template>
  <UILoading class="h-full min-h-80" />
</template>
