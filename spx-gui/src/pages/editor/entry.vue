<template>
  <div class="h-screen flex items-center justify-center">
    <UILoading />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UILoading } from '@/components/ui'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { usePageTitle } from '@/utils/utils'
import { getProjectEditorRoute } from '@/router'
import { initiateSignIn, useSignedInStateQuery } from '@/stores/user'

const title = { en: 'Opening project...', zh: '正在打开项目...' }

usePageTitle(title)

const route = useRoute()
const router = useRouter()
const signedInStateQuery = useSignedInStateQuery()

const projectName = computed(() => route.params.projectNameInput as string)
const publish = computed(() => route.query.publish != null)

watch(
  () => signedInStateQuery.data.value,
  (signedInState) => {
    if (signedInState == null) return
    if (!signedInState.isSignedIn) {
      initiateSignIn(route.fullPath)
      return
    }
    router.replace(getProjectEditorRoute(signedInState.user.username, projectName.value, publish.value))
  },
  { immediate: true }
)

watch(
  () => signedInStateQuery.error.value,
  (error) => {
    if (error == null) return
    if (error instanceof ApiException && error.code === ApiExceptionCode.errorUnauthorized) {
      initiateSignIn(route.fullPath)
      return
    }
    console.error('failed to resolve signed-in user for editor entry', error)
    router.replace('/')
  },
  { immediate: true }
)
</script>
