<template>
  <div class="ui-pagination-container">
    <button class="ui-pagination-button" :disabled="current === 1" @click="prevPage">
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.74984 11.6667C8.6005 11.6667 8.45115 11.6096 8.3374 11.4959L4.25407 7.41252C4.02599 7.18443 4.02599 6.81573 4.25407 6.58765L8.3374 2.50431C8.56549 2.27623 8.93419 2.27623 9.16227 2.50431C9.39036 2.7324 9.39036 3.1011 9.16227 3.32918L5.49137 7.00008L9.16227 10.671C9.39036 10.8991 9.39036 11.2678 9.16227 11.4959C9.04852 11.6096 8.89917 11.6667 8.74984 11.6667Z"
          fill="currentColor"
        />
      </svg>
    </button>

    <template v-for="page in pages" :key="page">
      <svg
        v-if="page === '...'"
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="8" cy="16" r="2" fill="#CBD2D8" />
        <circle cx="16" cy="16" r="2" fill="#CBD2D8" />
        <circle cx="24" cy="16" r="2" fill="#CBD2D8" />
      </svg>
      <button
        v-else
        :class="['ui-pagination-button', { active: page === current }]"
        @click="goToPage(page)"
      >
        {{ page }}
      </button>
    </template>

    <button class="ui-pagination-button" :disabled="current === total" @click="nextPage">
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.25 11.6667C5.10067 11.6667 4.95132 11.6096 4.83757 11.4959C4.60948 11.2678 4.60948 10.8991 4.83757 10.671L8.50847 7.00008L4.83757 3.32918C4.60948 3.1011 4.60948 2.7324 4.83757 2.50431C5.06565 2.27623 5.43435 2.27623 5.66244 2.50431L9.74577 6.58765C9.97385 6.81573 9.97385 7.18443 9.74577 7.41252L5.66244 11.4959C5.54869 11.6096 5.39933 11.6667 5.25 11.6667Z"
          fill="currentColor"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  total: number
  current: number
}>()
const emit = defineEmits<{
  'update:current': [number]
}>()

const prevPage = () => {
  if (props.current > 1) {
    emit('update:current', props.current - 1)
  }
}
const nextPage = () => {
  if (props.current < props.total) {
    emit('update:current', props.current + 1)
  }
}

const goToPage = (page: number) => {
  emit('update:current', page)
}

const pages = computed(() => {
  const result: (number | '...')[] = []

  // We want to show the pattern
  // `head, ... or number, extraPagesDisplayed, current, extraPagesDisplayed, ... or number, tail`
  const extraPagesDisplayed = 2
  const windowSize = extraPagesDisplayed * 2 + 1
  // We need 4 slots to display the fixed pattern
  // `head, ... or number, ... or number, tail`
  const fixedPages = 4

  if (props.total <= fixedPages + windowSize) {
    // Display all the pages
    for (let i = 1; i <= props.total; i++) {
      result.push(i)
    }
    return result
  }

  // To keep the width of the pagination bar fixed,
  // we need to handle the cases where the current page is close to the start or the end
  if (props.current <= windowSize) {
    // 1, 2, 3, 4, 5, 6, 7, ..., total
    for (let i = 1; i <= windowSize + extraPagesDisplayed; i++) {
      result.push(i)
    }
    result.push('...', props.total)
    return result
  }

  if (props.current >= props.total - fixedPages) {
    // 1, ..., total - 6, total - 5, total - 4, total - 3, total - 2, total - 1, total
    result.push(1, '...')
    for (let i = props.total - 2 - extraPagesDisplayed * 2; i <= props.total; i++) {
      result.push(i)
    }
    return result
  }

  // 1, ..., current - 2, current - 1, current, current + 1, current + 2, ..., total
  result.push(1, '...')
  for (let i = props.current - extraPagesDisplayed; i <= props.current + extraPagesDisplayed; i++) {
    result.push(i)
  }
  result.push('...', props.total)

  return result
})
</script>

<style lang="scss" scoped>
.ui-pagination-container {
  display: flex;
  gap: 8px;
}
.ui-pagination-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background-color: var(--ui-color-grey-300);
  color: var(--ui-color-grey-900);
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: var(--ui-color-grey-400);
  }

  &.active {
    background-color: var(--ui-color-primary-500);
    color: var(--ui-color-grey-100);
  }

  &:focus {
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
    background-color: var(--ui-color-grey-300);
    color: var(--ui-color-grey-700);
  }
}
</style>
