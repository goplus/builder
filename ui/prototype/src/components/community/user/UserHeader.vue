<script setup lang="ts">
import { computed, ref } from 'vue'

import { isSignedInUser } from '@/apis/user'
import TextView from '@/components/common/TextView.vue'
import UIButton from '@/components/ui/UIButton.vue'
import UIFormModal from '@/components/ui/UIFormModal.vue'
import type { UserProfile } from '@/data/mock'

const props = defineProps<{
  user: UserProfile
}>()

const displayName = ref(props.user.displayName)
const username = ref(props.user.username)
const bio = ref(props.user.bio)
const following = ref(false)
const showEditModal = ref(false)
const draftDisplayName = ref(displayName.value)
const draftUsername = ref(username.value)
const draftBio = ref(bio.value)

const isOwnProfile = computed(() => isSignedInUser(props.user.username))

function openEditProfile() {
  draftDisplayName.value = displayName.value
  draftUsername.value = username.value
  draftBio.value = bio.value
  showEditModal.value = true
}

function confirmEditProfile() {
  displayName.value = draftDisplayName.value.trim() || displayName.value
  username.value = draftUsername.value.trim() || username.value
  bio.value = draftBio.value.trim()
  showEditModal.value = false
}

function copyUsername() {
  void navigator.clipboard?.writeText(username.value)
}
</script>

<template>
  <section class="relative overflow-hidden rounded-md border border-grey-300 bg-grey-100 shadow-sm">
    <div class="h-[21.74vh] max-h-50 w-full bg-center bg-cover bg-no-repeat bg-grey-300">
      <img class="size-full object-cover" :src="user.cover" alt="" />
    </div>
    <div class="absolute bottom-5 left-5 size-38">
      <img class="size-full rounded-full border-2 border-grey-100 bg-grey-100 object-cover" :src="user.avatar" alt="" />
    </div>
    <div class="flex items-end gap-25 px-5 pt-5 pb-5 pl-48">
      <div class="flex min-w-0 flex-[1_1_0] flex-col gap-3">
        <div class="flex flex-wrap items-center gap-xl">
          <h2 class="m-0 min-w-0 truncate text-2xl text-title">{{ displayName }}</h2>
          <button
            class="min-w-0 cursor-pointer border-none bg-transparent p-0 font-main text-xs text-hint-2 transition-colors hover:text-primary-main"
            type="button"
            :title="`Username: ${username}`"
            @click="copyUsername"
          >
            <span class="block overflow-hidden text-ellipsis whitespace-nowrap">{{ username }}</span>
          </button>
          <span class="text-xs text-hint-2">{{ user.joinedAt }}</span>
        </div>
        <TextView class="max-h-[66px]" :text="bio" />
      </div>
      <div class="flex flex-[0_0_110px] justify-end">
        <UIButton v-if="isOwnProfile" @click="openEditProfile">Edit profile</UIButton>
        <UIButton v-else :type="following ? 'neutral' : 'primary'" @click="following = !following">
          {{ following ? 'Unfollow' : 'Follow' }}
        </UIButton>
      </div>
    </div>
  </section>

  <UIFormModal v-model:visible="showEditModal" title="Edit profile" size="medium">
    <form class="flex flex-col gap-4" @submit.prevent="confirmEditProfile">
      <label class="flex flex-col gap-1 text-sm text-hint-1">
        Name
        <input
          v-model="draftDisplayName"
          class="h-8 rounded-sm border border-grey-500 bg-grey-100 px-2 text-base text-title focus:border-primary-main focus:outline-none"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm text-hint-1">
        Username
        <input
          v-model="draftUsername"
          class="h-8 rounded-sm border border-grey-500 bg-grey-100 px-2 text-base text-title focus:border-primary-main focus:outline-none"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm text-hint-1">
        Description
        <textarea
          v-model="draftBio"
          class="min-h-20 resize-none rounded-sm border border-grey-500 bg-grey-100 px-2 py-1 text-base text-title focus:border-primary-main focus:outline-none"
        ></textarea>
      </label>
      <div class="mt-2 flex justify-end gap-3">
        <UIButton type="white" @click="showEditModal = false">Cancel</UIButton>
        <UIButton type="primary" @click="confirmEditProfile">Confirm</UIButton>
      </div>
    </form>
  </UIFormModal>
</template>
