<template>
  <div class="checkerboard-background">
    <div class="checkerboard"></div>
  </div>
</template>

<style scoped>
.checkerboard-background {
  background-color: #fff;
}

.checkerboard {
  background-size: 18px 18px;
  background-repeat: repeat;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGN49eH7fwYYePXh+38ARGwHoUrYy14AAAAASUVORK5CYII='); /* 2x2 checkerboard pattern */
}
</style>
