<!-- Header for Sprite/Sound/Stage Editor -->

<template>
  <div class="h-12 flex items-center justify-between border-b border-grey-400 pr-md">
    <slot></slot>
    <div class="extra flex items-center gap-2">
      <div id="editor-run-actions" class="flex items-center gap-2"></div>
      <slot name="extra"></slot>
    </div>
  </div>
</template>
