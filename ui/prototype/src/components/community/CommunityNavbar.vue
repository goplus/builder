<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import avatarImage from '@ui-images/avatar.png'
import logoSvg from '@/assets/navbar-logo.svg'

const router = useRouter()
const searchValue = ref('')

function submitSearch(event: Event) {
  event.preventDefault()
  const keyword = searchValue.value.trim()
  router.push(keyword === '' ? '/search' : `/search?q=${encodeURIComponent(keyword)}`)
}
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

        <RouterLink class="relative ml-6 flex h-12 items-center justify-center px-3 text-title no-underline hover:bg-grey-400" to="/user/code-kiko/projects" aria-label="Project menu">
          <svg aria-hidden="true" viewBox="0 0 20 20" class="size-5 overflow-visible fill-current">
            <path
              d="M6.608 1.771c.397 0 .788.099 1.137.287.347.186.642.456.86.784l.674 1 .005.008c.086.13.204.238.342.311.138.074.294.111.45.109h6.591c.635 0 1.245.253 1.694.703.449.449.702 1.059.702 1.694V15c0 .635-.253 1.245-.702 1.694-.449.45-1.059.702-1.694.702H3.333c-.635 0-1.245-.252-1.694-.702C1.19 16.245.938 15.635.938 15V4.167c0-.635.252-1.245.701-1.694.449-.45 1.059-.702 1.694-.702h3.275ZM3.333 3.23a.935.935 0 0 0-.663.273.936.936 0 0 0-.274.664V15c0 .249.099.487.274.663a.935.935 0 0 0 .663.274h13.334a.935.935 0 0 0 .663-.274.934.934 0 0 0 .274-.663V6.667a.936.936 0 0 0-.274-.664.935.935 0 0 0-.663-.273h-6.584a2.386 2.386 0 0 1-1.142-.282 2.399 2.399 0 0 1-.871-.791l-.674-1-.005-.007a.946.946 0 0 0-.338-.308.939.939 0 0 0-.445-.112H3.333ZM10 7.604c.403 0 .729.326.73.729v1.771h1.77c.403 0 .729.326.73.729 0 .403-.327.73-.73.73h-1.77v1.77a.73.73 0 0 1-1.46 0v-1.77H7.5a.73.73 0 0 1 0-1.459h1.77V8.333c0-.403.327-.729.73-.729Z"
            />
          </svg>
          <span class="ml-1.5 h-0 w-0 border-r-4 border-l-4 border-r-transparent border-l-transparent border-t-[5px] border-t-current" aria-hidden="true"></span>
        </RouterLink>

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
            class="h-8 w-full rounded-md border border-grey-400 bg-grey-100 py-1.25 pr-3 pl-7.5 text-sm text-text outline-none placeholder:text-hint-1"
            type="search"
            placeholder="Search project"
            v-model="searchValue"
          />
        </form>

        <RouterLink class="grid h-12 w-14 place-items-center px-3 text-title" to="/user/code-kiko" aria-label="Signed in user">
          <img class="size-8 rounded-full border border-grey-400 object-cover" :src="avatarImage" alt="" />
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
