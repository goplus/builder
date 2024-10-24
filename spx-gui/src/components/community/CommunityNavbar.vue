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
import { UIMenu, UITextInput, UIIcon } from '@/components/ui'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'
import NavbarDropdown from '../navbar/NavbarDropdown.vue'
import NavbarNewProjectItem from '@/components/navbar/NavbarNewProjectItem.vue'
import NavbarOpenProjectItem from '@/components/navbar/NavbarOpenProjectItem.vue'
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
</script>

<style lang="scss" scoped>
.search {
  margin-right: 8px;
  width: 340px;
  display: flex;
  align-items: center;
}
</style>
