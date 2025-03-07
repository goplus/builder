<template>
  <section class="courses-section" :style="{ '--project-num-in-row': numInRow }">
    <header class="header">
      <div class="icon" :style="{ backgroundColor: iconColor }"></div>
      <h2 class="title">
        <slot name="title"></slot>
      </h2>
    </header>
    <div class="courses-wrapper">
      <ListResultWrapper :query-ret="queryRet">
        <ul class="courses">
          <slot></slot>
        </ul>
      </ListResultWrapper>
    </div>
  </section>
</template>

<script setup lang="ts">
import ListResultWrapper from '../common/ListResultWrapper.vue'
import type { QueryRet } from '@/utils/query'

defineProps<{
  queryRet: QueryRet<unknown[]>
  numInRow: number,
  iconColor: string
}>()
</script>

<style scoped lang="scss">
.courses-section {
  .header {
    display: flex;
    align-items: center;
    .icon{
      width: 8px;
      height: 28px;
      border-radius: 0 5px 5px 0;
    }
    .title{
      padding-left: 10px;
      font-size: 20px;
    }
  }

  .courses-wrapper {
    margin: 8px 0 32px;
    .courses {
      display: grid;
      grid-template-columns: repeat(var(--project-num-in-row), 1fr);
      gap: 20px;
    }
  }
}
</style>