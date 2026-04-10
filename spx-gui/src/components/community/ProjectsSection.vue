<!-- Project list as a section -->

<template>
  <section :style="{ '--project-num-in-row': numInRow }">
    <header class="flex items-center justify-between" :class="isUserContext ? 'h-15 pt-5 pb-2' : 'h-13'">
      <h2 class="text-title" :class="isUserContext ? 'text-16' : 'text-20/7'">
        <slot name="title"></slot>
      </h2>
      <RouterUILink
        v-if="linkTo != null"
        v-radar="{ name: 'Link to more', desc: 'Link to more similar projects' }"
        class="flex items-center text-15"
        :to="linkTo"
      >
        <slot name="link"></slot>
        <UIIcon class="ml-2 w-5 h-5" type="arrowRightSmall" />
      </RouterUILink>
    </header>
    <div
      class="relative mt-2"
      :class="[isUserContext ? 'mb-4' : 'mb-8', !queryRet.data.value?.length ? 'bg-grey-100 rounded-md' : '']"
    >
      <ListResultWrapper content-type="project" :query-ret="queryRet" :height="254">
        <template v-if="!!slots.empty" #empty="emptyProps">
          <slot name="empty" v-bind="emptyProps"></slot>
        </template>
        <ul
          class="grid grid-cols-[repeat(var(--project-num-in-row),minmax(0,1fr))]"
          :class="isUserContext ? 'gap-4' : 'gap-5'"
        >
          <slot></slot>
        </ul>
      </ListResultWrapper>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
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

const props = defineProps<{
  linkTo?: string | null
  queryRet: QueryRet<unknown[] | null>
  context: Context
  numInRow: number
}>()

const slots = useSlots()
const isUserContext = computed(() => props.context === 'user')
</script>
