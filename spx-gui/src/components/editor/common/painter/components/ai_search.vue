<template>
  <div>
    <!-- AI搜图按钮 -->
    <button class="tool-btn ai-search-btn" :title="$t({ en: 'AI Image Search', zh: 'AI搜图' })" @click="showModal">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
        <circle cx="9" cy="9" r="2"></circle>
        <circle cx="15" cy="9" r="2"></circle>
        <path d="M8 13h8"></path>
      </svg>
      <span>{{ $t({ en: 'AI Search', zh: 'AI搜图' }) }}</span>
    </button>

    <!-- AI搜图弹窗 -->
    <n-modal
      v-model:show="isModalVisible"
      preset="card"
      :title="$t({ en: 'AI Image Search', zh: 'AI搜图' })"
      style="width: 600px"
      :bordered="false"
      size="huge"
      role="dialog"
      aria-modal="true"
    >
      <div class="ai-search-content">
        <!-- 搜索输入区域 -->
        <div class="search-section">
          <h3 class="section-title">{{ $t({ en: 'Search Keywords', zh: '搜索关键词' }) }}</h3>
          <div class="input-group">
            <n-input
              v-model:value="searchKeywords"
              type="textarea"
              :placeholder="$t({ en: 'Enter keywords to search for images...', zh: '输入关键词搜索图片...' })"
              :autosize="{ minRows: 1, maxRows: 1 }"
              clearable
              @blur="performSearch"
              @keyup.enter="performSearch"
            />
            <n-button type="primary" :loading="isSearching" @click="performSearch">
              {{ $t({ en: 'Search', zh: '搜索' }) }}
            </n-button>
          </div>
        </div>

        <!-- 搜索结果区域（与aigcGenerator.vue预览区域保持一致） -->
        <div v-if="previewUrls.length > 0" class="results-section">
          <h3 class="section-title">{{ $t({ en: 'Search Results', zh: '搜索结果' }) }}</h3>
          <div class="image-grid">
            <div
              v-for="(url, index) in previewUrls"
              :key="index"
              class="image-item"
              :class="{ selected: selectedImageIndex === index }"
              @click="selectImage(index)"
            >
              <img :src="url" :alt="`搜索结果 ${index + 1}`" />
              <div class="image-overlay">
                <div class="image-number">{{ index + 1 }}</div>
                <div v-if="selectedImageIndex === index" class="selected-indicator">✓</div>
              </div>
            </div>
          </div>
          <div v-if="selectedImageIndex >= 0" class="selection-hint">
            {{ $t({ en: `Selected image ${selectedImageIndex + 1}`, zh: `已选择图片 ${selectedImageIndex + 1}` }) }}
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-else-if="searchError && hasSearched && !isSearching" class="error-section">
          <div class="error-icon">⚠️</div>
          <p class="error-message">{{ searchError }}</p>
          <n-button type="primary" ghost @click="performSearch">
            {{ $t({ en: 'Retry', zh: '重试' }) }}
          </n-button>
        </div>

        <!-- 暂无结果提示 -->
        <div v-else-if="hasSearched && !isSearching && previewUrls.length === 0 && !searchError" class="no-results">
          <div class="no-results-icon">🔍</div>
          <p>{{ $t({ en: 'No images found', zh: '未找到相关图片' }) }}</p>
        </div>

        <!-- 加载状态 -->
        <div v-if="isSearching" class="loading-section">
          <n-spin size="medium" />
          <p>{{ $t({ en: 'Searching...', zh: '正在搜索...' }) }}</p>
        </div>
      </div>

      <!-- 弹窗底部按钮 -->
      <template #footer>
        <div class="modal-footer">
          <n-button @click="handleCancel">
            {{ $t({ en: 'Cancel', zh: '取消' }) }}
          </n-button>
          <n-button type="primary" :disabled="selectedImageIndex < 0 || isSearching" @click="handleConfirm">
            {{ $t({ en: 'Confirm', zh: '确认' }) }}
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NInput, NButton, NSpin } from 'naive-ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import {
  instantImageRecommend,
  transformToImageResults,
  processMockData,
  type ImageResult
} from '@/apis/image-recommend'
import { generateProjectContext } from '@/apis/project-context'

// Mock数据
const MOCK_SEARCH_DATA = {
  query: '猫咪 (enhanced with project context)',
  results_count: 4,
  results: [
    {
      id: 1101,
      image_path:
        'kodo://goplus-builder-usercontent-test/ai-generated/13be808c-a64fd26f-1535-4da7-a352-6cbe42662f02.svg',
      similarity: 0.92,
      rank: 1,
      source: 'search'
    },
    {
      id: 1102,
      image_path:
        'kodo://goplus-builder-usercontent-test/ai-generated/6e4b3ff9-8b142725-4217-4b18-972a-eb221bb82df2.svg',
      similarity: 0.88,
      rank: 2,
      source: 'generated'
    },
    {
      id: 1103,
      image_path: 'kodo://goplus-builder-usercontent-test/ai-generated/372ad25d-recraft_1756287423634474000.svg',
      similarity: 0.83,
      rank: 3,
      source: 'search'
    },
    {
      id: 1104,
      image_path: 'kodo://goplus-builder-usercontent-test/ai-generated/6e907c21-recraft_1756287466450053000.svg',
      similarity: 0.79,
      rank: 4,
      source: 'generated'
    }
  ]
}

// 开发环境Mock开关 - 也可以通过环境变量 VITE_USE_MOCK_AI_SEARCH 控制
// const USE_MOCK_DATA = import.meta.env.DEV || import.meta.env.VITE_USE_MOCK_AI_SEARCH === 'true'
const USE_MOCK_DATA = false

// 获取编辑器上下文
const editorCtx = useEditorCtx()

// 响应式数据（与aigcGenerator.vue保持一致的命名风格）
const isModalVisible = ref(false)
const searchKeywords = ref('')
const previewUrls = ref<string[]>([])
const selectedImageIndex = ref<number>(-1)
const isSearching = ref(false)
const hasSearched = ref(false)
const searchError = ref<string>('')

// 存储SVG原始代码（与aigcGenerator.vue保持一致）
const svgRawContents = ref<string[]>([])

// 为了向后兼容，保留searchResults
const searchResults = ref<ImageResult[]>([])

// 组件向外暴露的事件 - 为了与paintBoard.vue兼容
const emit = defineEmits<{
  (e: 'confirm', image: { id: string; title: string; thumbnail: string; url: string; description?: string }): void
}>()

// 显示弹窗
const showModal = () => {
  isModalVisible.value = true
  // 重置状态
  searchKeywords.value = ''
  previewUrls.value = []
  svgRawContents.value = []
  searchResults.value = []
  selectedImageIndex.value = -1
  hasSearched.value = false
  isSearching.value = false
  searchError.value = ''
}

// 选择图片
const selectImage = (index: number) => {
  selectedImageIndex.value = index
}

// 实际的AI图片搜索函数
const handleRealSearch = async () => {
  if (!searchKeywords.value.trim()) return

  try {
    // 获取项目ID，如果没有ID则使用默认值
    const projectId = editorCtx.project.id ? parseInt(editorCtx.project.id, 10) : 0
    // console.log('调用真实API，项目ID:', projectId)

    // 调用即时图片推荐API（与aigcGenerator.vue调用generateSvgDirect类似）
    const svgResult = await instantImageRecommend(projectId, searchKeywords.value, {
      top_k: 4,
      theme: '' // 可以根据需要设置主题
    })

    // 处理返回的图片（与aigcGenerator.vue处理生成结果保持一致）
    if (svgResult.svgContents && svgResult.svgContents.length > 0) {
      // 直接使用返回的blob URLs
      previewUrls.value = svgResult.svgContents.map((item) => item.blob)
      // 为每个图片创建对应的SVG内容
      svgRawContents.value = svgResult.svgContents.map((item) => item.svgContent)

      // 同时更新searchResults以保持向后兼容
      searchResults.value = transformToImageResults(svgResult, searchKeywords.value)
    } else {
      throw new Error('未找到搜索结果')
    }
  } catch (error) {
    console.error('AI搜索图片失败:', error)

    // 错误处理逻辑（与aigcGenerator.vue保持一致）
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('搜索超时，请重试')
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络后重试')
      } else if (error.message.includes('400')) {
        throw new Error('搜索参数错误')
      } else if (error.message.includes('500')) {
        throw new Error('服务器错误，请稍后重试')
      } else {
        throw new Error('搜索失败：' + error.message)
      }
    }
    throw new Error('搜索失败，请重试')
  }
}

// Mock数据处理函数
const handleMockSearch = async () => {
  // console.log('使用Mock数据进行搜索:', searchKeywords.value)

  try {
    // 使用统一的Mock数据处理函数
    const mockResult = await processMockData(
      MOCK_SEARCH_DATA as {
        query: string
        results_count: number
        results: Array<{
          id: number
          image_path: string
          similarity: number
          rank: number
          source: 'search' | 'generated'
        }>
      }
    )

    // 处理返回的图片（与aigcGenerator.vue处理生成结果保持一致）
    if (mockResult.svgContents && mockResult.svgContents.length > 0) {
      // 直接使用返回的blob URLs
      previewUrls.value = mockResult.svgContents.map((item) => item.blob)
      // 为每个图片创建对应的SVG内容
      svgRawContents.value = mockResult.svgContents.map((item) => item.svgContent)

      // 同时更新searchResults以保持向后兼容
      searchResults.value = transformToImageResults(mockResult, searchKeywords.value)
    } else {
      throw new Error('Mock数据处理失败')
    }

    // console.log('Mock搜索完成，预览URL数量:', previewUrls.value.length)
  } catch (error) {
    console.error('Mock数据处理失败:', error)
    throw error
  }
}

// 执行搜索（与aigcGenerator.vue的handleGenerate保持一致）
const performSearch = async () => {
  if (!searchKeywords.value.trim()) {
    previewUrls.value = []
    svgRawContents.value = []
    searchResults.value = []
    selectedImageIndex.value = -1
    hasSearched.value = false
    searchError.value = ''
    return
  }

  // 每次搜索开始时立即清空之前的结果
  previewUrls.value = []
  svgRawContents.value = []
  searchResults.value = []
  selectedImageIndex.value = -1
  searchError.value = ''

  isSearching.value = true
  hasSearched.value = true

  try {
    // 首先调用项目上下文生成接口
    try {
      const projectId = editorCtx.project.id ? parseInt(editorCtx.project.id, 10) : 0
      const projectName = editorCtx.project.name || '未命名项目'
      // console.log(projectName)
      const projectDescription = editorCtx.project.description || '空'

      // 调用项目上下文生成接口（忽略返回结果）
      await generateProjectContext(projectId, projectName, projectDescription)
      // console.log('项目上下文生成完成')
    } catch (contextError) {
      // 项目上下文生成失败不影响搜索功能，只记录错误
      console.warn('项目上下文生成失败:', contextError)
    }

    // 根据环境选择Mock数据或真实API（与aigcGenerator.vue保持一致）
    if (USE_MOCK_DATA) {
      await handleMockSearch()
    } else {
      await handleRealSearch()
    }
  } catch (error) {
    console.error('搜索图片失败:', error)
    previewUrls.value = []
    svgRawContents.value = []
    searchResults.value = []
    searchError.value = error instanceof Error ? error.message : '搜索失败，请重试'
  } finally {
    isSearching.value = false
  }
}

// 处理确认（与aigcGenerator.vue的handleConfirm保持一致）
const handleConfirm = () => {
  if (selectedImageIndex.value < 0 || selectedImageIndex.value >= previewUrls.value.length) return

  const selectedUrl = previewUrls.value[selectedImageIndex.value]
  const selectedSvgContent = svgRawContents.value[selectedImageIndex.value]

  const confirmData = {
    id: (selectedImageIndex.value + 1).toString(),
    title: `${searchKeywords.value} - 搜索结果 ${selectedImageIndex.value + 1}`,
    thumbnail: selectedUrl,
    url: selectedUrl,
    description: `AI搜索图片`,
    svgContent: selectedSvgContent // 添加SVG内容，与aigcGenerator.vue保持一致
  }

  emit('confirm', confirmData)
  handleCancel()
}

// 处理取消（与aigcGenerator.vue保持一致）
const handleCancel = () => {
  isModalVisible.value = false

  // 重置状态（与aigcGenerator.vue保持一致）
  setTimeout(() => {
    searchKeywords.value = ''
    previewUrls.value = []
    svgRawContents.value = []
    searchResults.value = []
    selectedImageIndex.value = -1
    isSearching.value = false
    hasSearched.value = false
    searchError.value = ''
  }, 300)
}

// 暴露搜索方法给父组件使用
defineExpose({
  performSearch
})
</script>

<style scoped>
/* 按钮样式 */
.tool-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #fff;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-height: 36px;
}

.tool-btn:hover {
  background-color: #f8f9fa;
  border-color: #2196f3;
  color: #2196f3;
}

.tool-btn:focus {
  outline: none;
  box-shadow: none;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn:disabled:hover {
  background-color: #fff;
  border-color: #e0e0e0;
  color: #666;
}

.tool-btn svg {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

.tool-btn span {
  font-weight: 500;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

/* 弹窗内容样式 */
.ai-search-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 400px;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.image-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background-color: #f5f5f5;
}

.image-item:hover {
  border-color: #2196f3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-item.selected {
  border-color: #4caf50;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.image-item img {
  width: 100%;
  height: 120px;
  object-fit: contain;
  display: block;
  background-color: transparent;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.image-item.selected .image-overlay {
  opacity: 1;
  background: rgba(59, 130, 246, 0.1);
}

.image-number {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.selected-indicator {
  background: #3b82f6;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

.selection-hint {
  text-align: center;
  color: #3b82f6;
  font-size: 14px;
  font-weight: 500;
  padding: 8px;
  background: #eff6ff;
  border-radius: 6px;
  margin-top: 12px;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px;
  color: #666;
  text-align: center;
  flex: 1;
}

.no-results-icon {
  font-size: 48px;
  opacity: 0.5;
}

.error-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px;
  color: #ef4444;
  text-align: center;
  flex: 1;
}

.error-icon {
  font-size: 48px;
  opacity: 0.8;
}

.error-message {
  font-size: 14px;
  color: #ef4444;
  margin: 0;
  line-height: 1.5;
}

.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px;
  color: #666;
  text-align: center;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 滚动条样式 */
.image-grid::-webkit-scrollbar {
  width: 6px;
}

.image-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.image-grid::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.image-grid::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
  }

  .image-item img {
    height: 100px;
  }
}
</style>
