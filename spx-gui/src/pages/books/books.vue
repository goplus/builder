<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Get book path from route params
const bookPath = computed(() => {
  const pathMatch = route.params.pathMatch
  if (Array.isArray(pathMatch)) {
    return pathMatch.join('/')
  }
  return pathMatch || ''
})

// Full HTML path
const htmlPath = computed(() => {
  const isHtmlFile = bookPath.value.endsWith('.html')
  
  if (isHtmlFile) {
    return `/books/${bookPath.value}`
  } else {
    // Directory path, load index.html
    return `/books/${bookPath.value}${bookPath.value.endsWith('/') ? '' : '/'}index.html`
  }
})

const iframeRef = ref<HTMLIFrameElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const loadBook = async () => {
  loading.value = true
  error.value = null

  try {
    // Check if file exists
    const response = await fetch(htmlPath.value, { method: 'HEAD' })
    if (!response.ok) {
      throw new Error(`Book not found: ${bookPath.value}`)
    }
    
    // Load success
    if (iframeRef.value) {
      iframeRef.value.src = htmlPath.value
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load book'
    console.error('Failed to load book:', err)
  } finally {
    loading.value = false
  }
}

const handleIframeLoad = () => {
  loading.value = false
}

const handleIframeError = () => {
  loading.value = false
  error.value = 'Failed to load book'
}

onMounted(() => {
  loadBook()
})

// Watch for route changes
watch(() => route.params.pathMatch, () => {
  loadBook()
})
</script>

<template>
  <div class="books-container">
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading...</p>
    </div>
    
    <div v-else-if="error" class="error-container">
      <h2>😕 Load Failed</h2>
      <p>{{ error }}</p>
      <router-link to="/" class="back-link">Back to Home</router-link>
    </div>
    
    <iframe
      v-else
      ref="iframeRef"
      :src="htmlPath"
      class="book-iframe"
      frameborder="0"
      @load="handleIframeLoad"
      @error="handleIframeError"
    />
  </div>
</template>

<style scoped>
.books-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.book-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  text-align: center;
}

.error-container h2 {
  color: #e74c3c;
  margin-bottom: 16px;
}

.error-container p {
  color: #666;
  margin-bottom: 24px;
}

.back-link {
  color: #3498db;
  text-decoration: none;
  padding: 8px 16px;
  border: 1px solid #3498db;
  border-radius: 4px;
  transition: all 0.3s;
}

.back-link:hover {
  background-color: #3498db;
  color: white;
}
</style>
