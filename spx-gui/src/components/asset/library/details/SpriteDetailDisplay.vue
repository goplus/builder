<template>
  <div class="container">
    <div class="carousel-container">
      <NCarousel
        show-arrow
        :show-dots="false"
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
        <template #arrow="{ prev, next }">
          <div type="button" class="custom-arrow custom-arrow--left" role="button" @click="prev">
            <NIcon :size="32" color="var(--n-text-color, #57606a)"><ChevronLeftFilled /></NIcon>
          </div>
          <div type="button" class="custom-arrow custom-arrow--right" role="button" @click="next">
            <NIcon :size="32" color="var(--n-text-color, #57606a)"><ChevronRightFilled /></NIcon>
          </div>
        </template>
      </NCarousel>
    </div>
    <div class="thumbnail-switcher-container">
      <div class="thumbnail-switcher">
        <div class="switcher-scroll-btn left" role="button" @click="handleThumbnailScroll(-1)">
          <NIcon :size="28">
            <ChevronLeftFilled />
          </NIcon>
        </div>
        <div
          ref="thumbnailContainer"
          class="thumbnail-list"
          :style="{
            '--count-of-group': COUNT_OF_GROUP
          }"
        >
          <div
            v-for="(preview, index) in previews"
            :key="preview.name"
            ref="thumbnail"
            class="thumbnail-item"
            :class="{
              'group-start': index % 4 === 0,
              active: currentIndex === index
            }"
            @click="currentIndex = index"
          >
            <NTooltip trigger="hover" placement="bottom">
              <template #trigger>
                <NImage
                  v-if="preview.img.value"
                  :src="preview.img.value ?? undefined"
                  width="100%"
                  object-fit="contain"
                  style="width: 100%"
                  preview-disabled
                />
                <UILoading v-else-if="preview.loading.value" />
              </template>
              <span v-if="preview.type === 'animation'"
                >{{ $t({ en: 'Animation', zh: '动画' }) }}: {{ preview.name }}</span
              >
              <span v-else>{{ $t({ en: 'Custom', zh: '造型' }) }}: {{ preview.name }}</span>
            </NTooltip>
          </div>
        </div>
        <div class="switcher-scroll-btn right" role="button" @click="handleThumbnailScroll(1)">
          <NIcon :size="28">
            <ChevronRightFilled />
          </NIcon>
        </div>
      </div>
      <div class="thumbnail-switcher-dots">
        <div
          v-for="i in dotCount"
          :key="i"
          class="thumbnail-switcher-dot"
          :class="{ active: currentDotIndex === i - 1 }"
          @click="handleCarouselSwitch((i - 1) * COUNT_OF_GROUP)"
        ></div>
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

// The number of items in each snapped scroll group
const COUNT_OF_GROUP = 4

const props = defineProps<{
  asset: AssetData<AssetType.Sprite>
}>()

const thumbnailContainer = ref<HTMLElement | null>(null)
const thumbnail = ref<HTMLElement[]>([])

const currentIndex = ref(0)

const handleCarouselSwitch = (index: number) => {
  thumbnail.value[index].scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center'
  })

  currentIndex.value = index
  currentDotIndex.value = Math.floor(index / COUNT_OF_GROUP)
}

const handleThumbnailScroll = (direction: number) => {
  if (thumbnailContainer.value) {
    const { clientWidth, scrollLeft, scrollWidth } = thumbnailContainer.value
    const offset = clientWidth * direction
    const maxLeft = scrollWidth - clientWidth

    let targetLeft = scrollLeft + offset
    if (direction > 0 && scrollLeft >= maxLeft) {
      targetLeft = 0
      currentDotIndex.value = 0
    } else if (direction < 0 && scrollLeft <= 0) {
      targetLeft = maxLeft
      currentDotIndex.value = dotCount.value - 1
    } else {
      currentDotIndex.value = Math.max(0, Math.floor(targetLeft / clientWidth))
    }

    thumbnailContainer.value.scrollTo({
      left: targetLeft,
      behavior: 'smooth'
    })

    currentIndex.value = currentDotIndex.value * COUNT_OF_GROUP
  }
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

const previews = computed(() => {
  return animations.value
    .map((a) => ({
      name: a.name,
      type: 'animation' as 'animation' | 'custom',
      img: a[imgSrc],
      loading: a[imgLoading]
    }))
    .concat(
      customs.value.map((c) => ({
        name: c.name,
        type: 'custom' as const,
        img: c[imgSrc],
        loading: c[imgLoading]
      }))
    )
})

const dotCount = computed(() => {
  return Math.ceil(previews.value.length / COUNT_OF_GROUP)
})

const currentDotIndex = ref(0)
</script>

<style lang="scss" scoped>
.container {
  --container-width: 85%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.carousel-container {
  width: var(--container-width);
  height: 0;
  overflow: visible;
  padding-bottom: calc(var(--container-width) * 0.5625);
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

.custom-arrow {
  cursor: pointer;
  background-color: var(--ui-color-grey-100, #ffffff);
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  transition: background-color 0.3s;
  box-shadow: var(--ui-box-shadow-big);
  z-index: 1;
  opacity: 0;
  transition: opacity 0.3s;
  position: absolute;
}

.carousel-container:hover .custom-arrow {
  opacity: 1;
}

.custom-arrow--left {
  left: 5px;
  top: 50%;
  transform: translateY(-50%);
}

.custom-arrow--right {
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
}

.thumbnail-switcher-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: var(--container-width);
}

.thumbnail-switcher {
  & {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    padding-top: 10px;
    margin: 5px 10px;
    width: var(--container-width);
  }

  .switcher-scroll-btn {
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: var(--ui-border-radius-1, 8px);
    padding: 0 5px;
    transition: background-color 0.2s;
    align-self: stretch;
  }

  .switcher-scroll-btn:hover {
    background-color: var(--ui-color-grey-300);
  }

  .thumbnail-list {
    --gap: 10px;
    --width: calc((100% - var(--gap) * (var(--count-of-group, 4) - 1)) / var(--count-of-group, 4));
    --height: calc(var(--width) * 0.618);
    display: flex;
    flex: 1;
    overflow-x: auto;
    gap: var(--gap);
    user-select: none;
    scrollbar-width: none;
    scroll-snap-type: x mandatory;
    padding-right: 1px;
  }

  .thumbnail-item {
    cursor: pointer;
    border-radius: var(--ui-border-radius-1, 8px);
    overflow: visible;
    width: var(--width);
    flex: 0 0 var(--width);
    height: 0;
    padding-bottom: var(--height);
    border: 1px solid var(--ui-color-border, #cbd2d8);

    box-shadow: var(--ui-box-shadow-small, 0px 2px 8px 0px rgba(51, 51, 51, 0.08));
    position: relative;
    transition: border-color 0.3s;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: transparent;
      filter: opacity(0.1);
      pointer-events: none;
      transition: background-color 0.3s;
    }

    &.group-start {
      scroll-snap-align: start;
    }

    &.active {
      border: 1px solid var(--ui-color-primary-main, #0bc0cf);
    }

    &.active::before {
      background-color: var(--ui-color-primary-main, #0bc0cf);
    }

    & > * {
      width: 100%;
      height: 100%;
      position: absolute;
      left: 0;
      top: 0;
    }
  }
}

.thumbnail-switcher-dots {
  display: flex;
  gap: 5px;
}

.thumbnail-switcher-dot {
  cursor: pointer;
  width: 5px;
  height: 5px;
  border-radius: 5px;
  background-color: var(--ui-color-grey-500);
  transition:
    background-color 0.3s,
    width 0.3s;

  &.active {
    background-color: var(--ui-color-primary-main, #0bc0cf);
    width: 10px;
  }
}
</style>
