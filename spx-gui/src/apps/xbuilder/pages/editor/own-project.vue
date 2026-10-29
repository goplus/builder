<script setup lang="ts">
import { untilLoaded } from '@/utils/query'
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { UIError, UILoading } from '@/components/ui'
import { useSignedIn } from '@/stores/user'
import { getProjectEditorRoute } from '../../router'

const props = defineProps<{
  projectNameInput: string
}>()

const route = useRoute()
const router = useRouter()
const signedIn = useSignedIn()

onMounted(async () => {
  const signedInState = await untilLoaded(signedIn.state)
  if (!signedInState.isSignedIn) {
    signedIn.signIn(route.fullPath)
    return
  }
  router.replace(
    getProjectEditorRoute(signedInState.user.username, props.projectNameInput, route.query.publish != null)
  )
})
</script>

<template>
  <UILoading v-if="signedIn.state.error.value == null" class="h-full min-h-80" />
  <UIError v-else class="h-full min-h-80">
    {{ $t(signedIn.state.error.value.userMessage) }}
  </UIError>
</template>
