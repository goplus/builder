<!-- Project list as a section -->

<template>
  <section :class="`context-${context}`" :style="{ '--project-num-in-row': numInRow }">
    <header class="header">
      <h2 class="title">
        <slot name="title"></slot>
      </h2>
      <RouterLink v-if="linkTo != null" class="link" :to="linkTo">
        <slot name="link"></slot>
        <UIIcon class="link-icon" type="arrowRightSmall" />
      </RouterLink>
    </header>
    <div class="projects-wrapper">
      <ListResultWrapper :query-ret="queryRet" :height="255">
        <ul class="projects">
          <slot></slot>
        </ul>
      </ListResultWrapper>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { QueryRet } from '@/utils/exception'
import ListResultWrapper from '../common/ListResultWrapper.vue'
import { UIIcon } from '@/components/ui'

/**
 * Context (page) where the projects section is used
 * - `home`: community home page
 * - `user`: user overview page
 * - `project`: project page
 */
type Context = 'home' | 'user' | 'project'

defineProps<{
  linkTo?: string
  queryRet: QueryRet<unknown[]>
  context: Context
  numInRow: number
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
    font-size: 15px;
    color: var(--ui-color-primary-main);
    text-decoration: none;
    transition: 0.1s;

    &:hover {
      color: var(--ui-color-primary-400);
    }
  }

  .link-icon {
    margin-left: 8px;
    width: 20px;
    height: 20px;
  }
}

.projects-wrapper {
  margin: 8px 0 32px;
  position: relative;
}

.projects {
  display: grid;
  grid-template-columns: repeat(var(--project-num-in-row), 1fr);
  gap: 20px;
}

.context-user {
  .header {
    height: 60px;
    padding: 20px 0 8px;
  }
  .title {
    font-size: 16px;
    line-height: 26px;
  }
  .projects-wrapper {
    margin: 8px 0 16px;
  }
  .projects {
    gap: 16px;
  }
}
</style>
