<script setup lang="ts">
import { onMounted } from 'vue'

import { getSignedInUser } from '@/apis/user'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/CommunityFooter.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import UICard from '@/components/ui/UICard.vue'

const user = getSignedInUser()
const tokenPreview = `prototype.${user.username}.offline`

onMounted(() => {
  document.title = 'Sign in token - XBuilder'
})
</script>

<template>
  <main class="flex min-h-screen min-w-360 flex-col bg-grey-300">
    <CommunityNavbar />
    <CenteredWrapper class="flex-1 py-10">
      <UICard class="p-6">
        <h1 class="m-0 text-2xl font-medium text-title">Local sign-in token</h1>
        <p class="mt-3 text-sm leading-6 text-grey-700">
          The prototype exposes a deterministic local token shape so the page can be previewed without Casdoor or backend state.
        </p>
        <dl class="mt-6 grid grid-cols-[160px_minmax(0,1fr)] gap-3 text-sm">
          <dt class="text-hint-1">Username</dt>
          <dd class="m-0 text-title">{{ user.username }}</dd>
          <dt class="text-hint-1">Display name</dt>
          <dd class="m-0 text-title">{{ user.displayName }}</dd>
          <dt class="text-hint-1">Token</dt>
          <dd class="m-0 rounded-sm bg-grey-300 px-3 py-2 font-mono text-title">{{ tokenPreview }}</dd>
        </dl>
      </UICard>
    </CenteredWrapper>
    <CommunityFooter />
  </main>
</template>
