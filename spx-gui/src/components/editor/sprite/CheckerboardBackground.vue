<!-- TODO: move to some more "common" location -->
<template>
  <div class="checkerboard-background-internal"></div>
</template>

<style scoped>
.checkerboard-background-internal {
  background-size: 36px 36px; /** grid size: 18x18 */
  background-repeat: repeat;
  image-rendering: pixelated;
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGN49eH7fwYYePXh+38ARGwHoUrYy14AAAAASUVORK5CYII='); /* 2x2 checkerboard pattern */
  background-color: #fff;
}
</style>
