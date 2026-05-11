<script setup lang="ts">
const navItems = [
  {
    label: 'Create',
    icon: 'plus',
    active: false,
    hasCaret: true,
  },
  {
    label: 'Projects',
    icon: 'project',
    active: false,
    hasCaret: false,
  },
  {
    label: 'Tutorial',
    icon: 'tutorial',
    active: true,
    hasCaret: false,
  },
]

const emit = defineEmits<{
  home: []
  search: [keyword: string]
}>()

let searchValue = ''

function submitSearch(event: Event) {
  event.preventDefault()
  emit('search', searchValue.trim())
}
</script>

<template>
  <header class="community-navbar">
    <div class="navbar-inner">
      <div class="navbar-leading">
        <button class="brand-button" type="button" @click="emit('home')" aria-label="Back to tutorials">
          <img src="@prototype/assets/logo.svg" alt="" />
          <span>XBuilder</span>
        </button>

        <span class="navbar-divider" aria-hidden="true"></span>

        <nav class="nav-icons" aria-label="Main navigation">
          <button
            v-for="item in navItems"
            :key="item.label"
            :class="{ active: item.active, 'has-caret': item.hasCaret }"
            type="button"
            :aria-label="item.label"
          >
            <svg
              v-if="item.icon === 'plus'"
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="nav-svg nav-svg-plus"
            >
              <path d="M12 4v16M4 12h16" />
            </svg>
            <svg
              v-else-if="item.icon === 'project'"
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="nav-svg"
            >
              <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
              <path d="M12 7v10M7 12h10" />
            </svg>
            <svg v-else aria-hidden="true" viewBox="0 0 24 24" class="nav-svg">
              <path d="M6 3.5h10.5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
              <path d="M8 15.5h9.5" />
              <path d="M17 2v5M14.5 4.5h5" />
            </svg>
            <span v-if="item.hasCaret" class="nav-caret" aria-hidden="true"></span>
          </button>
        </nav>
      </div>

      <form class="search-box" @submit="submitSearch">
        <svg aria-hidden="true" viewBox="0 0 24 24" class="search-icon">
          <circle cx="11" cy="11" r="7" />
          <path d="m16.5 16.5 4 4" />
        </svg>
        <input
          type="search"
          placeholder="Search project"
          @input="searchValue = ($event.target as HTMLInputElement).value"
        />
      </form>

      <button class="assistant-button" type="button" aria-label="Assistant">
        <span aria-hidden="true">🤖</span>
      </button>
    </div>
  </header>
</template>
