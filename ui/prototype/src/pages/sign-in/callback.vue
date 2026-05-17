<script setup lang="ts">
import { onMounted } from 'vue'

import { getSignedInUser } from '@/apis/user'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/CommunityFooter.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import PrototypeCard from '@/components/ui/PrototypeCard.vue'
import { getUserPageRoute } from '@/router'

const user = getSignedInUser()

onMounted(() => {
  document.title = 'Sign in callback - XBuilder'
})
</script>

<template>
  <main class="flex min-h-screen min-w-360 flex-col bg-grey-300">
    <CommunityNavbar />
    <CenteredWrapper class="flex flex-1 items-center justify-center py-12">
      <PrototypeCard class="w-140 p-6 text-center">
        <div class="mx-auto grid size-14 place-items-center rounded-full bg-primary-100 text-primary-700">✓</div>
        <h1 class="mt-5 text-2xl font-medium text-title">Prototype sign-in complete</h1>
        <p class="mt-3 text-sm leading-6 text-grey-700">
          This route mirrors the production callback surface with local deterministic state. No real authentication request is made.
        </p>
        <RouterLink
          class="mt-6 inline-flex h-9 items-center justify-center rounded-sm bg-primary-500 px-4 text-sm font-medium text-white no-underline"
          :to="getUserPageRoute(user.username)"
        >
          Continue as {{ user.displayName }}
        </RouterLink>
      </PrototypeCard>
    </CenteredWrapper>
    <CommunityFooter />
  </main>
</template>
