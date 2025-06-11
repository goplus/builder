<template>
  <NavbarWrapper centered>
    <template #left>
      <NavbarDropdown>
        <template #trigger>
          <UIIcon type="plus" />
        </template>
        <UIMenu>
          <NavbarNewProjectItem />
          <NavbarOpenProjectItem />
        </UIMenu>
      </NavbarDropdown>
      <RouterLink class="nav-link" to="/tutorial">
        {{ $t({ en: 'Tutorials', zh: '教程' }) }}
      </RouterLink>
    </template>
    <template #right>
      <div class="search">
        <UITextInput
          v-model:value="searchInput"
          :placeholder="$t({ en: 'Search project', zh: '搜索项目' })"
          @keypress.enter="handleSearch"
        >
          <template #prefix><UIIcon class="search-icon" type="search" /></template>
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
.nav-link {
  color: var(--ui-color-grey-100);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
  padding: 0 20px;
  height: 100%;
  display: flex;
  align-items: center;
  
  &:hover {
    color: white;
    background-color: var(--ui-color-primary-600);
  }
  
  &.router-link-active {
    color: white;
    font-weight: 600;
  }
}

.search {
  margin-right: 8px;
  width: 340px;
  display: flex;
  align-items: center;
}
</style>
