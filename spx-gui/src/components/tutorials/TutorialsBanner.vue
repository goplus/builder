<script lang="ts" setup>
import { useI18n } from '@/utils/i18n'

const i18n = useI18n()
</script>

<template>
  <div class="tutorials-banner-wrapper">
    <picture class="tutorials-banner">
      <source media="(max-width: 1679px)" srcset="@/components/tutorials/banner-medium.png" />
      <source media="(min-width: 1680px)" srcset="@/components/tutorials/banner-large.png" />
      <img src="@/components/tutorials/banner-medium.png" alt="Tutorials Banner" class="banner-image" />
    </picture>
    <div class="banner-text" :lang="i18n.lang.value">
      {{ $t({ en: 'Learn by doing, AI guides every step', zh: '边做边学, AI 导师引导每一步' }) }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '@/components/ui/responsive';

.tutorials-banner-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  .tutorials-banner {
    position: relative;
    width: 100%;

    .banner-image {
      display: block;
      width: 100%;
    }
  }

  .banner-text {
    position: absolute;
    white-space: nowrap;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--ui-color-grey-1000);

    &[lang='en'] {
      font-size: 2.2vw;
      letter-spacing: 2px;
    }

    &[lang='zh'] {
      font-size: 2.9vw;
      letter-spacing: 8.8px;
    }

    @include responsive(mobile) {
      &[lang='en'] {
        font-size: 2.3vw;
      }
      &[lang='zh'] {
        font-size: 2.8vw;
        letter-spacing: 6.4px;
      }
    }

    @include responsive(desktop-large) {
      &[lang='en'] {
        font-size: 1.5vw;
      }
      &[lang='zh'] {
        font-size: 1.8vw;
        letter-spacing: 6.4px;
      }
    }
  }
}
</style>
