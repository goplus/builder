<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import logoSvg from '@/assets/navbar-logo.svg'
import arrowMiniIcon from '@/assets/navbar-icons/arrow-mini.svg?raw'
import folderIcon from '@/assets/navbar-icons/folder.svg?raw'
import newProjectIcon from '@/assets/editor/navbar-icons/new.svg'
import openProjectIcon from '@/assets/editor/navbar-icons/open.svg'
import { usePrototypeSignIn } from '@/composables/prototypeSignIn'
import UIButton from '@/components/ui/UIButton.vue'

const router = useRouter()
const searchValue = ref('')
const projectMenuOpen = ref(false)
const projectMenuRef = ref<HTMLElement>()
const projectMenuOpenTimer = ref<number | null>(null)
const projectMenuCloseTimer = ref<number | null>(null)
const { signInModalOpen, openSignInModal, closeSignInModal } = usePrototypeSignIn()

function submitSearch(event: Event) {
  event.preventDefault()
  const keyword = searchValue.value.trim()
  router.push(keyword === '' ? '/search' : `/search?q=${encodeURIComponent(keyword)}`)
}

function toggleProjectMenu() {
  clearProjectMenuTimers()
  projectMenuOpen.value = !projectMenuOpen.value
}

function closeProjectMenu() {
  clearProjectMenuTimers()
  projectMenuOpen.value = false
}

function clearProjectMenuTimer(timer: typeof projectMenuOpenTimer) {
  if (timer.value == null) return
  window.clearTimeout(timer.value)
  timer.value = null
}

function clearProjectMenuTimers() {
  clearProjectMenuTimer(projectMenuOpenTimer)
  clearProjectMenuTimer(projectMenuCloseTimer)
}

function scheduleProjectMenuOpen() {
  clearProjectMenuTimer(projectMenuCloseTimer)
  clearProjectMenuTimer(projectMenuOpenTimer)
  projectMenuOpenTimer.value = window.setTimeout(() => {
    projectMenuOpen.value = true
  }, 100)
}

function scheduleProjectMenuClose() {
  clearProjectMenuTimer(projectMenuOpenTimer)
  clearProjectMenuTimer(projectMenuCloseTimer)
  projectMenuCloseTimer.value = window.setTimeout(() => {
    projectMenuOpen.value = false
  }, 100)
}

function createPrototypeProject() {
  closeProjectMenu()
  router.push('/editor/qingqing/niu-run')
}

function openPrototypeProject() {
  closeProjectMenu()
  router.push('/user/qingqing/projects')
}

function confirmPrototypeSignIn() {
  closeSignInModal()
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (!projectMenuRef.value?.contains(target)) closeProjectMenu()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeProjectMenu()
    closeSignInModal()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
  clearProjectMenuTimers()
})
</script>

<template>
  <nav class="sticky top-0 z-20 flex h-12 min-w-360 justify-center border-b border-grey-400 bg-grey-100 text-grey-1000" aria-label="Top navigation">
    <div class="flex h-12 w-310 items-stretch justify-between gap-3 desktop-large:w-373">
      <div class="flex h-12 min-w-0 basis-[30%] items-center">
        <RouterLink
          class="relative mx-6 flex h-12 items-center after:absolute after:-right-6 after:block after:h-6 after:w-px after:bg-dividing-line-1 after:content-['']"
          to="/"
          aria-label="XBuilder home"
        >
          <img class="block h-7.5 w-25.5" :src="logoSvg" alt="XBuilder" />
        </RouterLink>

        <div
          ref="projectMenuRef"
          class="relative flex h-12 items-center"
          @mouseenter="scheduleProjectMenuOpen"
          @mouseleave="scheduleProjectMenuClose"
        >
          <button
            class="flex h-full cursor-pointer appearance-none items-center border-0 bg-transparent px-3 py-0 text-title hover:bg-grey-400 active:bg-grey-500 focus-visible:outline-none"
            :class="{ 'bg-grey-400': projectMenuOpen }"
            type="button"
            aria-label="Project menu"
            aria-haspopup="menu"
            :aria-expanded="projectMenuOpen"
            @click.stop="toggleProjectMenu"
          >
            <span
              class="inline-flex size-5 items-center justify-center overflow-visible leading-none [&>svg]:block"
              aria-hidden="true"
              v-html="folderIcon"
            ></span>
            <span
              class="ml-1 inline-flex size-2 items-center justify-center leading-none [&>svg]:block"
              aria-hidden="true"
              v-html="arrowMiniIcon"
            ></span>
          </button>
          <div
            v-if="projectMenuOpen"
            class="absolute top-full left-0 z-30 mt-2 min-w-55 rounded-md bg-grey-100 p-2 shadow-sm"
            role="menu"
            @click.stop
          >
            <button class="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-sm border-0 bg-transparent px-2 py-2 pr-10 text-left text-sm text-title hover:bg-grey-300 focus-visible:outline-none" type="button" role="menuitem" @click="createPrototypeProject">
              <img class="size-6 shrink-0" :src="newProjectIcon" alt="" />
              <span>New project...</span>
            </button>
            <button class="relative mt-3 flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-sm border-0 bg-transparent px-2 py-2 pr-10 text-left text-sm text-title before:absolute before:-top-1.75 before:left-0 before:w-full before:border-t before:border-dividing-line-2 before:content-[''] hover:bg-grey-300 focus-visible:outline-none" type="button" role="menuitem" @click="openPrototypeProject">
              <img class="size-6 shrink-0" :src="openProjectIcon" alt="" />
              <span>Open project...</span>
            </button>
          </div>
        </div>

        <RouterLink class="relative flex h-12 items-center justify-center px-3 text-title no-underline hover:bg-grey-400" to="/tutorials" aria-label="Tutorials">
          <svg aria-hidden="true" viewBox="0 0 20 20" class="size-5 overflow-visible fill-current">
            <path
              d="M10.902 2.19a.73.73 0 1 1 0 1.459H4.884c-.49 0-.929.137-1.222.34-.29.202-.364.407-.364.534v8.619c.49-.247 1.051-.374 1.615-.374H16.84v-.564a.729.729 0 0 1 1.458 0v4.167c0 .456-.237.84-.56 1.087a1.817 1.817 0 0 1-1.106.361H4.913c-.761 0-1.519-.23-2.101-.676-.48-.368-.824-.875-.934-1.453a.73.73 0 0 1-.038-.229V4.523c0-.722.415-1.333.992-1.733.575-.398 1.315-.6 2.052-.6h6.018Zm-5.989 12.036c-.482 0-.917.148-1.214.376-.292.224-.401.481-.401.692l.005.08c.024.194.14.414.396.61.297.228.732.376 1.214.376h11.719a.42.42 0 0 0 .208-.053v-2.081H4.913Zm10.996-11.1c.13 0 .256.045.357.128a.56.56 0 0 1 .192.327l.369 1.948a.563.563 0 0 0 .393.393l1.948.369a.56.56 0 0 1 .327.191.56.56 0 0 1 0 .715.56.56 0 0 1-.327.193l-1.948.368a.563.563 0 0 0-.393.393l-.369 1.949a.56.56 0 0 1-.192.327.558.558 0 0 1-.714 0 .56.56 0 0 1-.166-.235l-.027-.092-.368-1.949a.563.563 0 0 0-.393-.393l-1.949-.368a.558.558 0 0 1-.327-.908.558.558 0 0 1 .327-.191l1.949-.369a.563.563 0 0 0 .393-.393l.368-1.948a.56.56 0 0 1 .193-.327.558.558 0 0 1 .357-.128Z"
            />
          </svg>
        </RouterLink>
      </div>

      <div class="flex min-w-0 grow basis-[40%] items-center justify-center" aria-hidden="true"></div>

      <div class="flex h-12 min-w-0 basis-[30%] items-center justify-end">
        <form class="relative flex h-12 w-91 items-center px-3 py-2.25" @submit="submitSearch">
          <svg aria-hidden="true" viewBox="0 0 24 24" class="pointer-events-none absolute top-4.5 left-6 z-1 size-3.5 fill-none stroke-hint-1 stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" />
          </svg>
          <input
            class="community-search-input h-8 w-full rounded-md border border-grey-400 bg-grey-100 py-0 pr-3 pl-7.5 text-text outline-none placeholder:text-grey-700"
            type="search"
            placeholder="Search project"
            v-model="searchValue"
          />
        </form>

        <div class="flex h-full items-center px-3 whitespace-nowrap">
          <UIButton class="community-sign-in-button" type="secondary" @click="openSignInModal">
            Sign in
          </UIButton>
        </div>
      </div>
    </div>
  </nav>

  <Teleport to="body">
    <div
      v-if="signInModalOpen"
      class="fixed inset-0 z-1100 flex items-center justify-center bg-overlay-modal"
      role="presentation"
      @click="closeSignInModal"
    >
      <section
        class="w-100 rounded-md border border-grey-300 bg-grey-100 p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prototype-sign-in-title"
        @click.stop
      >
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 id="prototype-sign-in-title" class="m-0 text-2xl font-medium text-title">Sign in to XBuilder</h2>
            <p class="mt-2 text-sm leading-5 text-grey-700">Continue with the local prototype account.</p>
          </div>
          <button
            class="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-grey-800 hover:bg-grey-300 active:bg-grey-400 focus-visible:outline-none"
            type="button"
            aria-label="Close sign-in dialog"
            @click="closeSignInModal"
          >
            <svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M12 4 4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <div class="mt-6 flex justify-end gap-3">
          <UIButton type="white" @click="closeSignInModal">Cancel</UIButton>
          <UIButton type="primary" @click="confirmPrototypeSignIn">Continue as Qingqing</UIButton>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.community-search-input {
  font-size: 14px;
  line-height: 22px;
}

.community-sign-in-button {
  font-size: 14px;
  line-height: 22px;
}
</style>
