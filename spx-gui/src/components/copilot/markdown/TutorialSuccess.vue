<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/utils/i18n'

const props = defineProps<{
  /**
   * The name of the tutorial that was completed
   */
  tutorial: string
}>()

const { t } = useI18n()

// Default navigation links
const nextTutorial = '/tutorials/next'
const tutorialList = '/tutorials'

// Default values - now fixed since we removed the props
const displayTitle = computed(() => 
  t({ 
    en: 'Congratulations!', 
    zh: '恭喜你!' 
  })
)

const displayEmoji = '🎉'

// Animation state
const isVisible = ref(false)

// Trigger animation when component mounts
onMounted(() => {
  // Small delay to ensure smooth animation
  setTimeout(() => {
    isVisible.value = true
  }, 100)
})
</script>

<template>
  <div 
    class="tutorial-success" 
    :class="{ 'is-visible': isVisible }"
  >
    <!-- Success icon and animation -->
    <div class="success-icon">
      <span class="emoji">{{ displayEmoji }}</span>
      <div class="confetti-container">
        <div v-for="i in 12" :key="i" class="confetti" :style="{ '--delay': i * 0.1 + 's' }"></div>
      </div>
    </div>

    <!-- Success content -->
    <div class="success-content">
      <h3 class="success-title">{{ displayTitle }}</h3>
      <div class="success-message">
        <slot>
          {{ t({ 
            en: `You have successfully completed the "${props.tutorial}" tutorial!`, 
            zh: `你已经成功完成了"${props.tutorial}"教程！` 
          }) }}
        </slot>
      </div>
      
      <!-- Navigation links -->
      <div class="tutorial-navigation">
        <a 
          :href="nextTutorial"
          class="nav-link next-tutorial"
        >
          {{ t({ 
            en: 'Continue to Next Tutorial →', 
            zh: '继续下一个教程 →' 
          }) }}
        </a>
        <a 
          :href="tutorialList"
          class="nav-link tutorial-list"
        >
          {{ t({ 
            en: 'Browse All Tutorials', 
            zh: '浏览所有教程' 
          }) }}
        </a>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tutorial-success {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  margin: 16px 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f9ff 100%);
  border: 2px solid var(--ui-color-green-300, #86efac);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
  transform: translateY(20px);
  opacity: 0;
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);

  &.is-visible {
    transform: translateY(0);
    opacity: 1;
  }

  /**
   * Success icon section with emoji and optional confetti
   */
  .success-icon {
    position: relative;
    flex-shrink: 0;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ui-color-green-100, #dcfce7);
    border-radius: 50%;
    border: 3px solid var(--ui-color-green-400, #4ade80);

    .emoji {
      font-size: 28px;
      line-height: 1;
      animation: bounce 2s ease-in-out infinite;
    }

    /* Confetti animation */
    .confetti-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }

    .confetti {
      position: absolute;
      width: 6px;
      height: 6px;
      background: var(--ui-color-yellow-400, #fbbf24);
      animation: confetti-fall 3s ease-out infinite;
      animation-delay: var(--delay);

      &:nth-child(odd) {
        background: var(--ui-color-blue-400, #60a5fa);
      }

      &:nth-child(3n) {
        background: var(--ui-color-red-400, #f87171);
      }

      &:nth-child(4n) {
        background: var(--ui-color-green-400, #4ade80);
      }

      &:nth-child(5n) {
        background: var(--ui-color-purple-400, #c084fc);
      }
    }
  }

  /**
   * Success content section with title and message
   */
  .success-content {
    flex: 1;
    min-width: 0;

    .success-title {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--ui-color-green-800, #166534);
      line-height: 1.3;
    }

    .success-message {
      font-size: 14px;
      line-height: 1.5;
      color: var(--ui-color-green-700, #15803d);

      // Support for markdown content in slot
      :deep(p) {
        margin: 0 0 8px 0;
        
        &:last-child {
          margin-bottom: 0;
        }
      }

      :deep(strong) {
        font-weight: 600;
        color: var(--ui-color-green-800, #166534);
      }

      :deep(code) {
        background: var(--ui-color-green-200, #bbf7d0);
        padding: 2px 4px;
        border-radius: 4px;
        font-family: var(--ui-font-family-code);
        font-size: 13px;
      }
    }

    .tutorial-navigation {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;

      .nav-link {
        display: inline-flex;
        align-items: center;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.2s ease;
        
        &.next-tutorial {
          background: var(--ui-color-green-600, #16a34a);
          color: white;
          
          &:hover {
            background: var(--ui-color-green-700, #15803d);
            transform: translateX(2px);
          }
        }
        
        &.tutorial-list {
          background: var(--ui-color-green-100, #dcfce7);
          color: var(--ui-color-green-800, #166534);
          border: 1px solid var(--ui-color-green-300, #86efac);
          
          &:hover {
            background: var(--ui-color-green-200, #bbf7d0);
            border-color: var(--ui-color-green-400, #4ade80);
          }
        }
      }
    }
  }
}

/* Animations */
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
  60% {
    transform: translateY(-4px);
  }
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100px) rotate(720deg);
    opacity: 0;
  }
}

/* Responsive design */
@media (max-width: 640px) {
  .tutorial-success {
    padding: 16px;
    gap: 12px;

    .success-icon {
      width: 50px;
      height: 50px;

      .emoji {
        font-size: 24px;
      }
    }

    .success-content {
      .success-title {
        font-size: 16px;
      }

      .success-message {
        font-size: 13px;
      }

      .tutorial-navigation {
        margin-top: 12px;
        
        .nav-link {
          padding: 6px 12px;
          font-size: 13px;
        }
      }
    }
  }
}
</style>