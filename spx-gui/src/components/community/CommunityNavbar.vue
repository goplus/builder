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
    </template>
    <template #right>
      <div class="search mobile-hide">
        <UITextInput
          v-model:value="searchInput"
          v-radar="{ name: 'Search input', desc: 'Input and press enter to search projects' }"
          :placeholder="$t({ en: 'Search project', zh: '搜索项目' })"
          @keypress.enter="handleSearch"
        >
          <template #prefix>
            <UIIcon class="search-icon" type="search" />
          </template>
        </UITextInput>
      </div>
      <!-- mobile -->
      <div class="mobile-search-btn" @click="expandSearch">
        <UIIcon type="search" />
      </div>

      <div v-if="isSearchExpanded" class="mobile-search-expanded">
        <div class="search-input-wrapper">
          <UITextInput
            ref="mobileSearchInput"
            v-model:value="searchInput"
            v-radar="{ name: 'Mobile search input', desc: 'Mobile search input' }"
            :placeholder="$t({ en: 'Search project', zh: '搜索项目' })"
            @blur="collapseSearch"
          >
            <template #prefix>
              <UIIcon class="search-icon" type="search" @click="handleSearch" />
            </template>
          </UITextInput>
        </div>
        <UIButton @click="collapseSearch">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
      </div>
    </template>
  </NavbarWrapper>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getStringParam } from '@/utils/route'
import { UIMenu, UITextInput, UIIcon, UIButton } from '@/components/ui'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'
import NavbarDropdown from '../navbar/NavbarDropdown.vue'
import NavbarNewProjectItem from '@/components/navbar/NavbarNewProjectItem.vue'
import NavbarOpenProjectItem from '@/components/navbar/NavbarOpenProjectItem.vue'
import { searchKeywordQueryParamName } from '@/pages/community/search.vue'
import { getSearchRoute } from '@/router'

const router = useRouter()
const searchInput = ref('')
// mobile search
const isSearchExpanded = ref(false)
const mobileSearchInput = ref<InstanceType<typeof UITextInput> | null>(null)
function expandSearch() {
  isSearchExpanded.value = true
}
function collapseSearch() {
  isSearchExpanded.value = false
  searchInput.value = ''
}

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
@import '@/components/ui/responsive.scss';

.search {
  margin-right: 8px;
  width: 340px;
  display: flex;
  align-items: center;
}

// mobile
.mobile-search-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: auto;
  cursor: pointer;
  // border-radius: 50%;
  // background-color: rgba(255, 255, 255, 0.1);
  // transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  @include responsive(mobile) {
    display: flex;
  }
}

.mobile-search-expanded {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  background-color: var(--ui-color-primary-main);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 12px;
  z-index: 1000;

  .search-input-wrapper {
    flex: 1;

    :deep(.ui-text-input) {
      width: 100%;
    }
  }
}

// mobile-hide
@include responsive(mobile) {
  .mobile-hide {
    display: none !important;
  }
}
</style>
