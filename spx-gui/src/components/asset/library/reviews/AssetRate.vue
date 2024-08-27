<template>
  <div class="container">
    <div class="left rate-summary">
      <div class="rate-avg">{{ rate.toFixed(1) ?? 'NaN' }}</div>
      <div class="rate-avg-star">
        <NRate :value="halfRoundedRate" allow-half readonly :color="colorSet[halfRoundedRate * 2 - 2]" size="small" />
      </div>
      <div class="rate-count">
        {{
          $t({
            en: `${$t(intlCompactNumber(rateCount))} ratings`,
            zh: `${$t(intlCompactNumber(rateCount))}个评分`
          })
        }}
      </div>
    </div>
    <div class="right rate-details">
      <div v-for="idx in [4, 3, 2, 1, 0]" :key="idx" class="rate-detail">
        <div class="rate-detail-name">{{ idx + 1 }}</div>
        <div class="rate-detail-bar">
          <NTooltip trigger="hover" placement="left">
            <template #trigger>
              <NProgress type="line" :percentage="((rateData?.detail[idx] ?? 0) / rateCount) * 100"
                :show-indicator="false" />
            </template>
            <span>
              {{
                $t({
                  en: `${$t(intlCompactNumber(rateData?.detail[idx] ?? 0))} people rated ${idx + 1} star(s)`,
                  zh: `${$t(intlCompactNumber(rateData?.detail[idx] ?? 0))} 个用户给出了 ${idx + 1} 星评价`
                })
              }}
            </span>
          </NTooltip>
        </div>
      </div>
    </div>
  </div>
  <UIModal v-model:visible="rateModalVisible" size="small">
    <div class="modal-header">
      <div class="modal-header-left">
        <div class="asset-name">
          {{ asset.displayName }}
        </div>
      </div>
      <div class="modal-header-right">
        <UIModalClose @click="rateModalVisible = false" />
      </div>
    </div>
    <div class="modal-main">
      <div class="modal-title">
        {{ $t({ zh: '为此素材评分', en: 'Rate this asset' }) }}
      </div>
      <div class="rate-input">
        <NRate v-model:value="userRate" :color="colorSet[userRate * 2 - 2]" />
        <div class="rate-value">{{ userRate }} {{ $t({ zh: '星', en: 'star' }) }}</div>
      </div>
      <!-- We may add a text area here for users to leave comments in the future.  -->
    </div>
    <div class="modal-footer">
      <UIButton type="secondary" @click="rateModalVisible = false">
        {{ $t({ zh: '取消', en: 'Cancel' }) }}
      </UIButton>
      <UIButton type="primary" @click="handleRate">
        {{ $t({ zh: '提交', en: 'Submit' }) }}
      </UIButton>
    </div>
  </UIModal>
</template>

<script lang="ts" setup>
import { getAssetRate, rateAsset, type AssetData, type AssetRate } from '@/apis/asset'
import { useAsyncComputed } from '@/utils/utils'
import { computed, ref } from 'vue'
import { NRate, NProgress, NTooltip } from 'naive-ui'
import type { LocaleMessage } from '@/utils/i18n'
import UIModal from '@/components/ui/modal/UIModal.vue'
import UIModalClose from '@/components/ui/modal/UIModalClose.vue'
import UIButton from '@/components/ui/UIButton.vue'

const props = defineProps<{
  asset: AssetData
}>()

const rateData = useAsyncComputed(async () => {
    //if be not found,only return 404
    const res = await getAssetRate(props.asset.id)
    if (res.detail === null) {
      return {
        rate: NaN,
        detail: [0, 0, 0, 0, 0]
      }
    }
    return formatRate(res)
    
})

// format rate detail data to array like [0, 0, 0, 0, 0]
const formatRate = (rate: AssetRate) => {
  //rate.detail is an object like [{score: 1, count: 1}, {score: 3, count: 2}, {score: 4, count: 1}],it may less than 5,so we need to fill the array
  const detail = Array.from({ length: 5 }, (_, i) => rate.detail.find((item) => item.score === i + 1)?.count ?? 0)
  return {
    rate: rate.rate,
    detail
  }
}

const rate = computed(() => {
  return rateData.value?.rate ?? NaN
})

const halfRoundedRate = computed(() => {
  return Math.round(rate.value * 2) / 2
})

const rateCount = computed(() => {
  return rateData.value?.detail.reduce((acc, cur) => acc + cur, 0) ?? 0
})

const rateModalVisible = ref(false)

const userRate = ref(5)

const handleRate = () => {
  rateAsset(props.asset.id, userRate.value)
  if (rateData.value) {
    rateData.value.detail[userRate.value - 1]++
    rateData.value.rate = (rateData.value.rate * rateCount.value + userRate.value) / (rateCount.value + 1)
  }
  rateModalVisible.value = false
}

const openRateModal = () => {
  rateModalVisible.value = true
}

defineExpose({
  openRateModal
})

// Gradient color set for rating stars
const colorSet = [
  '#d74a31',
  '#dc602a',
  '#e27623',
  '#e78c1c',
  '#eda215',
  '#f2b80e',
  '#f8ce07',
  '#fbd904',
  '#fde300'
]

/**
 * Format number to compact notation
 * Returns a proxy object that can be used to format the number in different locales
 * @example
 * ```js
 * const num = 1234567
 * const formatter = intlCompactNumber(num)
 * formatter.en // 1.23M
 * formatter.zh // 123.46万
 * ```
 */
const intlCompactNumber = (num: number, options?: Intl.NumberFormatOptions) => {
  return new Proxy({} as LocaleMessage, {
    get: (_, key) => {
      if (typeof key === 'string') {
        return new Intl.NumberFormat(key, {
          notation: 'compact',
          maximumFractionDigits: 2,
          ...options
        }).format(num)
      }
      return undefined
    }
  })
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: row;
}

.left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.rate-summary {
  margin-right: 15px;
}

.rate-avg {
  font-size: 24px;
  font-weight: bold;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.rate-count {
  font-size: 12px;
}

.right {
  display: flex;
  flex-direction: column;
  gap: 0px;
  flex: 1;
}

.rate-detail {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.rate-detail-name {
  font-size: 12px;
}

.rate-detail-bar {
  flex: 1;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header-left {
  display: flex;
  align-items: center;
}

.modal-header-right {
  display: flex;
  align-items: center;
}

.modal-main {
  padding: 1rem;
}

.asset-name {
  font-size: 16px;
  font-weight: bold;
}

.modal-title {
  font-size: 16px;
  font-weight: bold;
}

.rate-input {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 10px;
}
</style>
