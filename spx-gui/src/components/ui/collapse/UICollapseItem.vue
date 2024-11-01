<script setup lang="ts">
import { computed } from 'vue'
import UIIcon from '../icons/UIIcon.vue'
import { useCollapseCtx } from './UICollapse.vue'

const props = defineProps<{
  title: string
  name: string
}>()

const collapseCtx = useCollapseCtx()

const expanded = computed(() => collapseCtx.expandedNames.value.includes(props.name))

function handleToggle() {
  collapseCtx.expandedNames.value = expanded.value
    ? collapseCtx.expandedNames.value.filter((name) => name !== props.name)
    : [...collapseCtx.expandedNames.value, props.name]
}
</script>

<template>
  <li class="ui-collapse-item" :class="{ expanded }">
    <header class="header" @click="handleToggle">
      <h5 class="title">{{ title }}</h5>
      <UIIcon class="arrow" type="arrowAlt" />
    </header>
    <main class="main">
      <slot></slot>
    </main>
  </li>
</template>

<style lang="scss" scoped>
.ui-collapse-item {
  display: flex;
  flex-direction: column;

  + .ui-collapse-item {
    &::before {
      content: '';
      display: block;
      height: 1px;
      background: var(--ui-color-grey-400);
      margin: 16px 0;
    }
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: margin-bottom 0.3s;

  .title {
    font-size: 16px;
    line-height: 26px;
    color: var(--ui-color-title);
  }

  .arrow {
    width: 16px;
    height: 16px;
    transform: rotate(180deg);
    color: var(--ui-color-hint-1);
    transition: transform 0.3s;
  }
}

.main {
  flex: 0 0 auto;
  visibility: hidden;
  opacity: 0;
  height: 0;
  overflow: hidden;
  // TODO: optimize height transition
  transition:
    visibility 0s,
    opacity 0.2s,
    height 0.3s;
}

.expanded {
  .header {
    margin-bottom: 8px;
  }
  .arrow {
    transform: rotate(0deg);
  }
  .main {
    visibility: visible;
    opacity: 1;
    height: fit-content;
  }
}
</style>
