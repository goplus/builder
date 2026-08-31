<script setup lang="ts">
import { useMessageHandle } from '@/utils/exception'
import { UIButton } from '@/components/ui'
import type { FunctionChangeReview } from './function-change-review'

const props = defineProps<{ review: FunctionChangeReview }>()
defineEmits<{ inspect: [] }>()
const undo = useMessageHandle(() => props.review.undo(), {
  en: 'Failed to undo function adjustment',
  zh: '撤销函数调整失败'
})
</script>

<template>
  <section
    v-radar="{ name: 'Function parameter review', desc: 'Review calls affected by parameter changes' }"
    class="mx-3 mb-2 flex-none rounded-sm border border-dividing-line-2 bg-primary-100 px-3 py-2 text-body-medium"
  >
    <p class="text-title">
      {{
        $t({
          en: review.referencesIncomplete
            ? `${review.name}: parameters changed · references not confirmed`
            : review.remaining.length === 0
              ? `${review.name}: all ${review.calls.length} calls checked`
              : `${review.name}: parameters changed · ${review.remaining.length} calls to check`,
          zh: review.referencesIncomplete
            ? `${review.name}：参数已修改 · 引用范围待确认`
            : review.remaining.length === 0
              ? `${review.name}：${review.calls.length} 处调用均已检查`
              : `${review.name}：参数已修改 · ${review.remaining.length} 处调用待检查`
        })
      }}
    </p>
    <p class="mt-1 text-caption text-grey-800">
      {{
        $t({
          en: 'Check each call. Argument values are not filled in automatically.',
          zh: '请逐处检查调用，系统不会自动补填参数值。'
        })
      }}
    </p>
    <p v-if="!review.parametersComplete" role="status" class="mt-1 text-caption text-grey-800">
      {{
        $t({
          en: 'Finish the parameter list before completing the review.',
          zh: '参数列表尚未写完整，请完成编辑后再结束检查。'
        })
      }}
    </p>
    <p v-if="review.referencesIncomplete" role="status" class="mt-1 text-caption text-grey-800">
      {{
        $t({
          en: 'The original references were not loaded. Undo this adjustment and wait for references before trying again.',
          zh: '修改前的引用尚未加载完整。请撤销本次调整，待引用加载后再修改。'
        })
      }}
    </p>
    <p v-if="review.hasConflictingEdits" role="status" class="mt-1 text-caption text-grey-800">
      {{
        $t({
          en: 'Other code was also edited. Use project undo to avoid overwriting it.',
          zh: '期间还修改了其他代码。为避免覆盖，请使用顶部的项目撤销逐步还原。'
        })
      }}
    </p>
    <div class="mt-2 flex flex-wrap gap-2">
      <UIButton
        v-radar="{ name: 'Inspect affected calls', desc: 'Open the next unchecked call in Peek' }"
        size="small"
        type="white"
        @click="$emit('inspect')"
      >
        {{
          $t(
            review.remaining.length === 0
              ? { en: 'View definition', zh: '查看定义' }
              : { en: 'Check calls', zh: '检查调用' }
          )
        }}
      </UIButton>
      <UIButton
        v-radar="{
          name: 'Undo function adjustment',
          desc: 'Undo parameter and call edits without reverting other project changes'
        }"
        size="small"
        :disabled="!review.canUndo"
        type="neutral"
        :loading="undo.isLoading.value"
        @click="undo.fn"
      >
        {{ $t({ en: 'Undo adjustment', zh: '撤销本次调整' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'Complete call review', desc: 'Finish manual call review, without a separate save step' }"
        size="small"
        :disabled="!review.canComplete"
        @click="review.complete()"
      >
        {{ $t({ en: 'Finish review', zh: '完成检查' }) }}
      </UIButton>
    </div>
  </section>
</template>
