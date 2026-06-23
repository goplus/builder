<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { UIError, UILoading } from '@/components/ui'
import { useSignIn, useSignedInStateQuery } from '@/stores/user'
import { untilNotNull } from '@/utils/utils'
import { getProjectEditorRoute } from '../../router'

const props = defineProps<{
  projectNameInput: string
}>()

const route = useRoute()
const router = useRouter()
const signIn = useSignIn()
const signedInStateQuery = useSignedInStateQuery()

onMounted(async () => {
  const signedInState = await untilNotNull(signedInStateQuery.data)
  if (!signedInState.isSignedIn) {
    signIn(route.fullPath)
    return
  }
  router.replace(
    getProjectEditorRoute(signedInState.user.username, props.projectNameInput, route.query.publish != null)
  )
})
</script>

<template>
  <UILoading v-if="signedInStateQuery.error.value == null" class="h-full min-h-80" />
  <UIError v-else class="h-full min-h-80">
    {{ $t(signedInStateQuery.error.value.userMessage) }}
  </UIError>
</template>
