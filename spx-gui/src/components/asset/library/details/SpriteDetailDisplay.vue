<template>
  <div class="container">
    <div class="carousel-container">
      <NCarousel
        show-arrow
        autoplay
        class="carousel"
        :interval="5000"
        :current-index="currentIndex"
        @update:current-index="handleCarouselSwitch"
      >
        <NCarouselItem v-for="anim in animations" :key="anim.name">
          <AnimationPlayer
            :costumes="anim.costumes"
            :duration="anim.duration"
            :sound="null"
            :style="{ width: '100%', height: '100%' }"
          />
        </NCarouselItem>
        <NCarouselItem v-for="custom in customs" :key="custom.name">
          <NImage
            v-if="custom[imgSrc].value"
            :src="custom[imgSrc].value ?? undefined"
            width="100%"
            object-fit="contain"
            style="width: 100%"
          />
          <UILoading v-else-if="custom[imgLoading].value" />
        </NCarouselItem>
      </NCarousel>
    </div>
    <div class="carousel-switcher-container">
      <div class="switcher-scroll-btn left" role="button">
        <NIcon :size="28">
          <ChevronLeftFilled />
        </NIcon>
      </div>
      <div class="carousel-switcher">
        <div
          v-for="(anim, index) in animations"
          :key="anim.name"
          class="switcher"
          @click="currentIndex = index"
        >
          <NTooltip trigger="hover" placement="bottom">
            <template #trigger>
              <NImage
                v-if="anim[imgSrc].value"
                :src="anim[imgSrc].value ?? undefined"
                width="100%"
                object-fit="contain"
                style="width: 100%"
                preview-disabled
              />
              <UILoading v-else-if="anim[imgLoading].value" />
            </template>
            <span
              >{{
                $t({
                  en: `Animation: ${anim.name}`,
                  zh: `动画: ${anim.name}`
                })
              }}
            </span>
          </NTooltip>
        </div>
        <div
          v-for="(custom, index) in customs"
          :key="custom.name"
          class="switcher"
          @click="currentIndex = index + animations.length"
        >
          <NTooltip trigger="hover" placement="bottom">
            <template #trigger>
              <NImage
                v-if="custom[imgSrc].value"
                :src="custom[imgSrc].value ?? undefined"
                width="100%"
                object-fit="contain"
                style="width: 100%"
                preview-disabled
              />
              <UILoading v-else-if="custom[imgLoading].value" />
            </template>
            <span
              >{{
                $t({
                  en: `Custom: ${custom.name}`,
                  zh: `造型: ${custom.name}`
                })
              }}
            </span>
          </NTooltip>
        </div>
      </div>
      <div class="switcher-scroll-btn right" role="button">
        <NIcon :size="28">
          <ChevronRightFilled />
        </NIcon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import { cachedConvertAssetData } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import type { AssetData, AssetType } from '@/apis/asset'
import { NImage, NCarousel, NCarouselItem, NTooltip, NIcon } from 'naive-ui'
import { ChevronLeftFilled, ChevronRightFilled } from '@vicons/material'
import { UILoading } from '@/components/ui'
import { computed, ref } from 'vue'
import AnimationPlayer from '@/components/editor/sprite/animation/AnimationPlayer.vue'

const props = defineProps<{
  asset: AssetData<AssetType.Sprite>
}>()

const currentIndex = ref(0)

const handleCarouselSwitch = (index: number) => {
  currentIndex.value = index
}

const sprite = useAsyncComputed(() => {
  return cachedConvertAssetData(props.asset)
})

const imgSrc = Symbol('imgSrc')
const imgLoading = Symbol('imgLoading')

// get animations and load the first costume image as the preview
const animations = computed(() => {
  return (
    sprite.value?.animations.map((a) => {
      const [url, loading] = useFileUrl(() => a.costumes[0].img)
      return {
        ...a,
        [imgSrc]: url,
        [imgLoading]: loading
      }
    }) ?? []
  )
})

// get customs that are not in the animations
// and load the images
const customs = computed(() => {
  return (
    sprite.value?.costumes
      .filter((c) => {
        return animations.value.every((a) => {
          return a.costumes.every((ac) => ac !== c)
        })
      })
      .map((c) => {
        const [url, loading] = useFileUrl(() => c.img)
        return {
          ...c,
          [imgSrc]: url,
          [imgLoading]: loading
        }
      }) ?? []
  )
})
</script>

<style scoped>
.carousel-container {
  width: 100%;
  height: 0;
  overflow: visible;
  padding-bottom: 61.8%;
  position: relative;
}

.carousel {
  position: absolute;
  width: calc(100% - 20px);
  height: calc(100% - 10px);
  top: 5px;
  left: 10px;

  border-radius: var(--ui-border-radius-1, 8px);
  box-shadow: var(--ui-box-shadow-small, 0px 2px 8px 0px rgba(51, 51, 51, 0.08));
}

.carousel-switcher-container {
  --width: 150px;
  --height: calc(var(--width) * 0.618);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  margin: 5px 10px;
}

.switcher-scroll-btn {
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: var(--ui-border-radius-1, 8px);
  height: var(--height);
  padding: 0 5px;
}

.switcher-scroll-btn:hover {
  background-color: var(--ui-color-grey-300);
}

.carousel-switcher {
  display: flex;
  overflow-x: auto;
  gap: 10px;
  gap: 10px;

  scrollbar-width: none;
}

.switcher {
  cursor: pointer;
  border-radius: var(--ui-border-radius-1, 8px);
  overflow: hidden;
  width: var(--width);
  flex: 0 0 var(--width);
  height: var(--height);
  border: 1px solid var(--ui-color-border, #cbd2d8);

  box-shadow: var(--ui-box-shadow-small, 0px 2px 8px 0px rgba(51, 51, 51, 0.08));
}
</style>
