<template>
  <div class="brush-size-selector">
    <div
      class="brush-size-circle active"
      :style="{ '--brush-size': '24px' }"
	  :title="$t({ en: 'Brush size', zh: '画笔大小' }) + `: ${brushSize}px`"
      @click="brushPopoverVisible = !brushPopoverVisible"
    ></div>
    <Transition name="slide-fade" mode="out-in" appear>
      <div
        v-show="brushPopoverVisible"
        class="brush-size-popover"
      >
        <div
          v-for="preset in props.presets"
          :key="preset"
          class="brush-size-item"
          :style="{ '--brush-size': preset + 'px' }"
		  :title="$t({ en: 'Brush size', zh: '画笔大小' }) + ': ' + preset + 'px'"
          @click="brushSize = preset"
        >
          <div class="brush-size-circle" :class="{ active: brushSize === preset }"></div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    presets?: number[]
  }>(),
  {
    presets: () => [8, 18, 28, 42, 54]
  }
)

const brushSize = defineModel('brushSize', {
  type: Number,
  default: 28,
})

const brushPopoverVisible = ref(false)
</script>

<style scoped>
.brush-size-selector {
  position: relative;
}

.brush-size-circle {
  width: var(--brush-size);
  height: var(--brush-size);
  border-radius: 50%;
  background-color: var(--ui-color-grey-700);
  background-clip: padding-box;
  border: 2px solid transparent;
  transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
  box-sizing: content-box;
  cursor: pointer;
}

.brush-size-circle.active {
  background-color: var(--ui-color-grey-1000);
  border-color: var(--ui-color-grey-100);
  box-shadow: 0px 3px 8px 0px rgba(51, 51, 51, 0.48);
}

.brush-size-popover {
  position: absolute;
  top: 100%;
  margin-top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-big);
  border-radius: var(--ui-border-radius-1);
  padding: 8px;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: stretch;
  z-index: 10000;
}

.brush-size-item {
  margin: 0 4px;
  min-width: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
</style>
