<template>
  <NavbarWrapper centered>
    <template #left>
      <NavbarDropdown
        :trigger-radar="{ name: 'Project menu', desc: 'Hover to see project options (create/open project)' }"
      >
        <template #trigger>
          <UIIcon type="plus" />
        </template>
        <UIMenu>
          <NavbarNewProjectItem />
          <NavbarOpenProjectItem />
        </UIMenu>
      </NavbarDropdown>
      <NavbarLang v-if="!isSignedIn()" />
      <NavbarTutorials v-if="showTutorialsEntry" />
    </template>
    <template #right>
      <div class="search">
        <UITextInput
          v-model:value="searchInput"
          v-radar="{ name: 'Search input', desc: 'Input and press enter to search projects' }"
          :placeholder="$t({ en: 'Search project', zh: '搜索项目' })"
          clearable
          @keypress.enter="handleSearch"
        >
          <template #prefix><UIIcon type="search" /></template>
        </UITextInput>
      </div>
    </template>
  </NavbarWrapper>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getStringParam } from '@/utils/route'
import { UIMenu, UITextInput, UIIcon } from '@/components/ui'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'
import NavbarDropdown from '../navbar/NavbarDropdown.vue'
import NavbarNewProjectItem from '@/components/navbar/NavbarNewProjectItem.vue'
import NavbarOpenProjectItem from '@/components/navbar/NavbarOpenProjectItem.vue'
import { searchKeywordQueryParamName } from '@/pages/community/search.vue'
import { getSearchRoute } from '@/router'
import { showTutorialsEntry } from '@/utils/env'
import NavbarLang from '../navbar/NavbarLang.vue'
import NavbarTutorials from '../navbar/NavbarTutorials.vue'
import { isSignedIn } from '@/stores/user'

const router = useRouter()
const searchInput = ref('')

function handleSearch() {
  router.push(getSearchRoute(searchInput.value))
}

// Clear search input when leaving search page
watch(
  () => router.currentRoute.value.meta.isSearch,
  (isSearch, oldIsSearch) => {
    if (oldIsSearch && !isSearch) searchInput.value = ''
  }
)

// Sync search input from query
watch(
  () => router.currentRoute.value,
  (r) => {
    if (r.meta.isSearch) {
      const keywordInQuery = getStringParam(router, searchKeywordQueryParamName)
      if (keywordInQuery != null && keywordInQuery !== searchInput.value) {
        searchInput.value = keywordInQuery
      }
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.search {
  padding: 0 12px;
  width: 340px;
  display: flex;
  align-items: center;
}
</style>
