<template>
  <v-layer>
    <v-image
      v-if="imageRef"
      :config="{
        image: imageRef,
      }"
    />
  </v-layer>
</template>
<script setup lang="ts">
import { useBackdropStore } from "@/store/modules/backdrop";
import { watchEffect } from "vue";
import { ref } from "vue";

const backdropStore = useBackdropStore();
const imageRef = ref<HTMLImageElement | null>(null);

watchEffect(() => {
  const src = backdropStore.backdrop.files[0]?.url;
  if (!src) {
    imageRef.value = null;
    return;
  }
  const image = new Image();
  image.src = src;
  image.onload = () => {
    imageRef.value = image;
  };
});
</script>
