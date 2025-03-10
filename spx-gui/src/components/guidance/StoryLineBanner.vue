<script setup lang="ts">
import { UIButton } from '@/components/ui'
import CommunityCard from '../community/CommunityCard.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function handleBrowse() {
  router.push('/storyline-list')
}
</script>

<template>
  <CommunityCard class="storyline-banner">
    <div class="main">
      <h1 class="title">
        {{ $t({ en: 'Go+ Builder Courses', zh: 'Go+ Builder 课程' }) }}
      </h1>
      <h4 class="sub-title">
        {{ $t({ en: 'From Beginner to Expert', zh: '精品课程，从入门到精通' }) }}
      </h4>
      <UIButton class="browse-btn" type="primary" size="large" @click="handleBrowse">
        {{ $t({ en: 'Browse Courses', zh: '查看课程' }) }}
      </UIButton>
    </div>
  </CommunityCard>
</template>

<style lang="scss" scoped>
.storyline-banner {
  padding: 12px;
}

.main {
  position: relative;
  padding: 48px 52px 50px;

  border-radius: var(--ui-border-radius-2);
  color: #073156;
  background-color: #f0faff;
}

.title {
  font-size: 24px;
  line-height: 1.5;
}

.sub-title {
  font-size: 13px;
  line-height: 20px;
  margin-top: 8px;
}

.browse-btn {
  margin-top: 28px;
}
</style>
