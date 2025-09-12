<!-- Project list as a section -->

<template>
  <section :class="`context-${context}`" :style="{ '--project-num-in-row': numInRow }">
    <header class="header">
      <h2 class="title">
        <slot name="title"></slot>
      </h2>
      <RouterUILink
        v-if="linkTo != null"
        v-radar="{ name: 'Link to more', desc: 'Link to more similar projects' }"
        class="link"
        :to="linkTo"
      >
        <slot name="link"></slot>
        <UIIcon class="link-icon" type="arrowRightSmall" />
      </RouterUILink>
    </header>
    <div class="projects-wrapper">
      <ListResultWrapper content-type="project" :query-ret="queryRet" :height="254">
        <template v-if="!!slots.empty" #empty="emptyProps">
          <slot name="empty" v-bind="emptyProps"></slot>
        </template>
        <ul class="projects">
          <slot></slot>
        </ul>
      </ListResultWrapper>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useSlots } from 'vue'
import type { QueryRet } from '@/utils/query'
import { UIIcon } from '@/components/ui'
import ListResultWrapper from '../common/ListResultWrapper.vue'
import RouterUILink from '../common/RouterUILink.vue'

/**
 * Context (page) where the projects section is used
 * - `home`: community home page
 * - `user`: user overview page
 * - `project`: project page
 */
type Context = 'home' | 'user' | 'project'

defineProps<{
  linkTo?: string | null
  queryRet: QueryRet<unknown[]>
  context: Context
  numInRow: number
}>()

const slots = useSlots()
</script>

<style lang="scss" scoped>
@import '@/components/ui/responsive.scss';

section {
  font-size: 16px;

  @include responsive(mobile) {
    font-size: 12px;
  }
}

.header {
  height: 3.25em;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    line-height: 1.75em;
    font-size: 1.25em;
    color: var(--ui-color-title);
  }

  .link {
    display: flex;
    align-items: center;
    font-size: 0.94em;
  }

  .link-icon {
    margin-left: 0.5em;
    width: 1.25em;
    height: 1.25em;
  }
}

.projects-wrapper {
  margin: 8px 0 32px;
  position: relative;

  &:not(:has(.projects)) {
    background-color: var(--ui-color-grey-100);
    border-radius: var(--ui-border-radius-2);
  }
}

.projects {
  display: grid;
  grid-template-columns: repeat(var(--project-num-in-row), 1fr);
  gap: 1.25em;
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
