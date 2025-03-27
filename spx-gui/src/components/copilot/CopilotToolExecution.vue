<template>
    <div class="tool-execution" :class="{ 'is-executing': isExecuting }">
      <div class="tool-header">
        <span class="tool-icon"><i class="fas fa-cog"></i></span>
        <span class="tool-name">{{ toolName }}</span>
        <span class="tool-status" :class="statusClass">
          {{ statusText }}
        </span>
      </div>
      
      <div v-if="showDetails" class="tool-details">
        <div v-if="isSuccess" class="result-panel">
          <pre>{{ formattedResult }}</pre>
        </div>
        <div v-else-if="isError" class="error-panel">
          {{ errorMessage }}
        </div>
        <div v-else class="loading-panel">
          <div class="loading-spinner"></div>
          <span>{{ $t({ en: 'Executing...', zh: '执行中...' }) }}</span>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { computed, ref } from 'vue'
  
  const props = defineProps<{
    toolName: string;
    status: 'pending' | 'success' | 'error';
    result?: any;
    errorMessage?: string;
  }>()
  
  const showDetails = ref(true);
  
  const isExecuting = computed(() => props.status === 'pending');
  const isSuccess = computed(() => props.status === 'success');
  const isError = computed(() => props.status === 'error');
  
  const statusClass = computed(() => ({
    'status-pending': isExecuting.value,
    'status-success': isSuccess.value,
    'status-error': isError.value
  }))
  
  const statusText = computed(() => {
    if (isExecuting.value) return '执行中';
    if (isSuccess.value) return '执行成功';
    if (isError.value) return '执行失败';
    return '';
  })
  
  const formattedResult = computed(() => {
    if (!props.result) return '';
    return JSON.stringify(props.result, null, 2);
  })
  
  function toggleDetails() {
    showDetails.value = !showDetails.value;
  }
  </script>
  
  <style lang="scss" scoped>
  .tool-execution {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    margin: 8px 0;
    background-color: #f9f9f9;
    
    &.is-executing {
      border-color: #4dabf7;
      background-color: #e7f5ff;
    }
    
    .tool-header {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      
      .tool-icon {
        margin-right: 8px;
        color: #555;
      }
      
      .tool-name {
        font-weight: 500;
        flex: 1;
      }
      
      .tool-status {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 12px;
        
        &.status-pending {
          background-color: #4dabf7;
          color: white;
        }
        
        &.status-success {
          background-color: #40c057;
          color: white;
        }
        
        &.status-error {
          background-color: #fa5252;
          color: white;
        }
      }
    }
    
    .tool-details {
      padding: 12px;
      border-top: 1px solid #e0e0e0;
      
      pre {
        margin: 0;
        padding: 8px;
        background-color: #f1f3f5;
        border-radius: 4px;
        overflow-x: auto;
      }
      
      .error-panel {
        color: #e03131;
      }
      
      .loading-panel {
        display: flex;
        align-items: center;
        
        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e9ecef;
          border-top-color: #4dabf7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        }
      }
    }
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  </style>