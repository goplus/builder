<script lang="ts" setup>
import { useI18n } from '@/utils/i18n'

const i18n = useI18n()
</script>

<template>
  <div class="tutorials-banner-wrapper">
    <div class="banner">
      <img src="@/components/tutorials/banner.png" alt="Tutorials Banner" class="banner-image" />
    </div>
    <div class="banner-text" :lang="i18n.lang.value">
      <div class="title">{{ $t({ en: 'Explore the User Tutorial', zh: '探索用户教程' }) }}</div>
      <div class="des">
        {{ $t({ en: 'Learn XBuilder and improve programming skills', zh: '学习 XBuilder，提高编程技能' }) }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tutorials-banner-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  .banner {
    overflow: hidden;

    .banner-image {
      height: 340px;
      width: 100%;
      object-fit: cover;
      object-position: center;
    }
  }

  .banner-text {
    position: absolute;
    white-space: nowrap;
    top: 50%;
    left: 50%;
    color: #006375;

    .title {
      font-size: 36px;
    }

    .des {
      font-size: 18px;
      margin-top: 8px;
    }

    &[lang='en'] {
      transform: translate(0%, -80%);
    }
    &[lang='zh'] {
      transform: translate(70%, -80%);
    }
  }
}
</style>
