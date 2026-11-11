<template>
  <span class="generation-indicator" role="status" :aria-label="$t({ en: 'Generating', zh: '正在生成' })"></span>
</template>

<style scoped>
@property --generation-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes generation-progress {
  to {
    --generation-angle: 360deg;
  }
}

.generation-indicator {
  position: absolute;
  inset: 0;
  padding: 2px;
  border-radius: inherit;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  background: conic-gradient(
    from var(--generation-angle) at 50% 50%,
    var(--ui-color-primary-200) 100deg,
    var(--ui-color-primary-main) 288deg,
    var(--ui-color-primary-100) 324deg,
    var(--ui-color-primary-200) 360deg
  );
  animation: generation-progress 3s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .generation-indicator {
    animation: none;
  }
}
</style>
