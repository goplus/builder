<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  /**
   * The path to the UI element, e.g., "navbar > dropdown"
   */
  path: string

  /**
   * The text to display in the tooltip when the link is clicked
   */
  tooltip?: string
}>()

const linkRef = ref<HTMLElement | null>(null)
const tooltipVisible = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })

/**
 * Find UI element by path selector
 * Path format: "navbar > dropdown" or "element-class" or "#element-id"
 */
function findElementByPath(path: string): HTMLElement | null {
  try {
    // Handle different path formats
    if (path.includes(' > ')) {
      // Handle hierarchical path like "navbar > dropdown"
      const parts = path.split(' > ').map(p => p.trim())
      let element: HTMLElement | null = document.body
      
      for (const part of parts) {
        if (!element) return null
        
        // Try different selection strategies
        let nextElement: HTMLElement | null = null
        
        // Try by class name
        nextElement = element.querySelector(`.${part}`) as HTMLElement
        if (!nextElement) {
          // Try by tag name
          nextElement = element.querySelector(part) as HTMLElement
        }
        if (!nextElement) {
          // Try by data attribute
          nextElement = element.querySelector(`[data-name="${part}"]`) as HTMLElement
        }
        if (!nextElement) {
          // Try by aria-label
          nextElement = element.querySelector(`[aria-label*="${part}"]`) as HTMLElement
        }
        
        element = nextElement
      }
      
      return element
    } else {
      // Handle single selector
      if (path.startsWith('#')) {
        return document.getElementById(path.slice(1))
      } else if (path.startsWith('.')) {
        return document.querySelector(path) as HTMLElement
      } else {
        // Try multiple strategies for single element
        let element = document.querySelector(`.${path}`) as HTMLElement
        if (!element) {
          element = document.querySelector(`[data-name="${path}"]`) as HTMLElement
        }
        if (!element) {
          element = document.querySelector(`[aria-label*="${path}"]`) as HTMLElement
        }
        if (!element) {
          element = document.querySelector(path) as HTMLElement
        }
        return element
      }
    }
  } catch (error) {
    console.warn(`Failed to find element for path: ${path}`, error)
    return null
  }
}

/**
 * Highlight the target element with a visual effect
 */
function highlightElement(element: HTMLElement) {
  // Remove any existing highlight
  document.querySelectorAll('.ui-highlight-overlay').forEach(el => el.remove())
  
  const rect = element.getBoundingClientRect()
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
  
  // Create highlight overlay
  const overlay = document.createElement('div')
  overlay.className = 'ui-highlight-overlay'
  overlay.style.cssText = `
    position: absolute;
    top: ${rect.top + scrollTop - 4}px;
    left: ${rect.left + scrollLeft - 4}px;
    width: ${rect.width + 8}px;
    height: ${rect.height + 8}px;
    border: 2px solid var(--ui-color-primary-main, #1976d2);
    border-radius: 4px;
    background: rgba(25, 118, 210, 0.1);
    box-shadow: 0 0 10px rgba(25, 118, 210, 0.3);
    pointer-events: none;
    z-index: 9999;
    animation: ui-highlight-pulse 2s ease-in-out;
  `
  
  document.body.appendChild(overlay)
  
  // Scroll element into view if needed
  element.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center',
    inline: 'center'
  })
  
  // Show tooltip if provided and position it near the target element
  if (props.tooltip) {
    // Calculate tooltip position - show it above the element with some offset
    const tooltipX = rect.left + scrollLeft + rect.width / 2
    const tooltipY = rect.top + scrollTop - 10 // Position above the element
    
    tooltipPosition.value = { x: tooltipX, y: tooltipY }
    tooltipVisible.value = true
    
    // Auto-hide tooltip after 3 seconds
    setTimeout(() => {
      tooltipVisible.value = false
    }, 3000)
  }
  
  // Remove highlight after animation
  setTimeout(() => {
    overlay.remove()
  }, 2000)
}

/**
 * Handle link click to highlight the target element
 */
function handleClick(event: MouseEvent) {
  event.preventDefault()
  
  const targetElement = findElementByPath(props.path)
  
  if (targetElement) {
    highlightElement(targetElement)
  } else {
    console.warn(`UI element not found for path: ${props.path}`)
    
    // Still show tooltip if provided, even if element not found
    if (props.tooltip) {
      tooltipVisible.value = true
      setTimeout(() => {
        tooltipVisible.value = false
      }, 3000)
    }
  }
}

// Add CSS animation keyframes
onMounted(() => {
  // Add global styles for highlight animation
  if (!document.querySelector('#ui-highlight-styles')) {
    const style = document.createElement('style')
    style.id = 'ui-highlight-styles'
    style.textContent = `
      @keyframes ui-highlight-pulse {
        0% {
          opacity: 0;
          transform: scale(0.95);
        }
        50% {
          opacity: 1;
          transform: scale(1.02);
        }
        100% {
          opacity: 0.7;
          transform: scale(1);
        }
      }
    `
    document.head.appendChild(style)
  }
})
</script>

<template>
  <span ref="linkRef" class="ui-highlight-link">
    <a href="#" class="link" @click="handleClick">
      <slot></slot>
    </a>
    
    <!-- Positioned tooltip that appears at the target element -->
    <Teleport to="body">
      <div
        v-if="tooltip && tooltipVisible"
        class="ui-highlight-tooltip"
        :style="{
          position: 'absolute',
          left: tooltipPosition.x + 'px',
          top: tooltipPosition.y + 'px',
          transform: 'translateX(-50%)',
          zIndex: 10000
        }"
      >
        <div class="tooltip-content">
          {{ tooltip }}
        </div>
      </div>
    </Teleport>
  </span>
</template>

<style lang="scss" scoped>
.ui-highlight-link {
  display: inline;
  
  .link {
    color: var(--ui-color-primary-main);
    text-decoration: underline;
    cursor: pointer;
    transition: color 0.2s;
    
    &:hover {
      color: var(--ui-color-primary-400);
    }
    
    &:active {
      color: var(--ui-color-primary-600);
    }
  }
}

.ui-highlight-tooltip {
  pointer-events: none;
  animation: tooltip-fade-in 0.2s ease-out;
  
  .tooltip-content {
    background: var(--ui-color-grey-1000);
    color: var(--ui-color-grey-100);
    padding: 8px 12px;
    border-radius: var(--ui-border-radius-1);
    font-size: 12px;
    line-height: 1.5;
    box-shadow: var(--ui-box-shadow-big);
    max-width: 200px;
    word-wrap: break-word;
    
    /* Arrow pointing down to the highlighted element */
    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: var(--ui-color-grey-1000);
    }
  }
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>