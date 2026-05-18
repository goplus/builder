<script lang="ts">
export type PrototypeTagVariant = 'stroke' | 'none'
export type PrototypeTagColor = 'default' | 'primary' | 'warning' | 'error'
export type PrototypeTagSize = 'small'
</script>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: PrototypeTagVariant
    color?: PrototypeTagColor
    size?: PrototypeTagSize
    disabled?: boolean
  }>(),
  {
    variant: 'stroke',
    color: 'default',
    size: 'small',
    disabled: false
  }
)
</script>

<template>
  <span
    class="prototype-tag"
    :class="[`variant-${variant}`, `color-${color}`, `size-${size}`, { disabled }]"
  >
    <slot />
  </span>
</template>

<style scoped>
.prototype-tag {
  height: var(--prototype-tag-height);
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: var(--prototype-tag-gap);
  border-radius: var(--prototype-tag-border-radius);
  padding: var(--prototype-tag-padding);
  color: var(--prototype-tag-color);
  font-size: var(--prototype-tag-font-size);
  line-height: var(--prototype-tag-line-height);
  white-space: nowrap;
}

.prototype-tag.disabled {
  --prototype-tag-color: var(--ui-color-grey-600) !important;
}

.prototype-tag.variant-stroke {
  border: 1px solid var(--prototype-tag-border-color);
  background: var(--prototype-tag-bg-color);
}

.prototype-tag.variant-stroke.disabled {
  --prototype-tag-bg-color: var(--ui-color-grey-300);
  --prototype-tag-border-color: var(--ui-color-grey-400);
}

.prototype-tag.variant-none {
  border: 0;
  background: none;
}

.prototype-tag.color-default {
  --prototype-tag-color: var(--ui-color-grey-900);
  --prototype-tag-bg-color: var(--ui-color-grey-300);
  --prototype-tag-border-color: var(--ui-color-grey-400);
}

.prototype-tag.color-primary {
  --prototype-tag-color: var(--ui-color-primary-main);
  --prototype-tag-bg-color: var(--ui-color-primary-200);
  --prototype-tag-border-color: var(--ui-color-primary-300);
}

.prototype-tag.color-warning {
  --prototype-tag-color: var(--ui-color-yellow-500);
  --prototype-tag-bg-color: var(--ui-color-yellow-200);
  --prototype-tag-border-color: var(--ui-color-yellow-300);
}

.prototype-tag.color-error {
  --prototype-tag-color: var(--ui-color-red-500);
  --prototype-tag-bg-color: var(--ui-color-red-200);
  --prototype-tag-border-color: var(--ui-color-red-300);
}

.prototype-tag.size-small {
  --prototype-tag-height: 20px;
  --prototype-tag-padding: 0 8px;
  --prototype-tag-font-size: 12px;
  --prototype-tag-line-height: 18px;
  --prototype-tag-border-radius: 4px;
  --prototype-tag-gap: 4px;
}
</style>
