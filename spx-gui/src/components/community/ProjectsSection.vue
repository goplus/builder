<!-- Project list as a section -->

<template>
  <section>
    <header class="header">
      <h2 class="title">
        <slot name="title"></slot>
      </h2>
      <RouterLink class="link" :to="linkTo">
        <slot name="link"></slot>
        <UIIcon class="link-icon" type="arrowRightSmall" />
      </RouterLink>
    </header>
    <ul class="projects">
      <UILoading v-if="queryRet.isLoading.value" :mask="false" />
      <!-- TODO: simpler UIError & UIEmpty here -->
      <UIError v-else-if="queryRet.error.value != null" :retry="queryRet.refetch">
        {{ $t(queryRet.error.value.userMessage) }}
      </UIError>
      <UIEmpty
        v-else-if="queryRet.data.value != null && queryRet.data.value.length === 0"
        size="large"
      />
      <template v-else-if="queryRet.data.value != null">
        <slot></slot>
      </template>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { QueryRet } from '@/utils/exception'
import { UIIcon, UILoading, UIError, UIEmpty } from '@/components/ui'

defineProps<{
  linkTo: string
  queryRet: QueryRet<unknown[]>
}>()
</script>

<style lang="scss" scoped>
.header {
  height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    line-height: 28px;
    font-size: 20px;
    color: var(--ui-color-title);
  }

  .link {
    display: flex;
    color: var(--ui-color-primary-main);
    text-decoration: none;
  }

  .link-icon {
    margin-left: 8px;
    width: 20px;
    height: 20px;
  }
}

.projects {
  margin: 20px 0 32px;

  // same height as `ProjectItem`, to prevent layout shift
  min-height: 260px;
  position: relative;

  display: flex;
  overflow: hidden;
  align-items: center;
  gap: 20px;
}
</style>
