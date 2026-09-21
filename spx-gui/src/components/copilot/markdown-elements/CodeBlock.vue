<script setup lang="ts">
import { useSlotText } from '@/utils/vnode'
import { useMessageHandle } from '@/utils/exception'
import CodeView from '@/components/common/CodeView.vue'
import { useCodeHiddenInChat } from '../context'
import BlockWrapper from './common/BlockWrapper.vue'
import BlockFooter from './common/BlockFooter.vue'
import BlockActionBtn from './common/BlockActionBtn.vue'

defineProps<{
  language?: string
}>()

const code = useSlotText()
const codeHidden = useCodeHiddenInChat()

const handleCopy = useMessageHandle(
  () => navigator.clipboard.writeText(code.value),
  { en: 'Failed to copy code to clipboard', zh: '复制代码到剪贴板失败' },
  { en: 'Code copied to clipboard', zh: '代码已复制到剪贴板' }
).fn
</script>

<template>
  <!-- In teaching scenarios the code is shown so the user can read it, but selection, copying and
       one-click insertion are disabled: they must type it themselves to learn. -->
  <BlockWrapper v-if="codeHidden">
    <div class="select-none py-3 pl-3" @copy.prevent @contextmenu.prevent>
      <CodeView class="min-w-0 overflow-x-auto pr-3" :language="language" mode="block" line-numbers>
        {{ code }}
      </CodeView>
    </div>
  </BlockWrapper>
  <BlockWrapper v-else>
    <div class="py-3 pl-3">
      <CodeView class="min-w-0 overflow-x-auto pr-3" :language="language" mode="block" line-numbers>
        {{ code }}
      </CodeView>
    </div>
    <BlockFooter>
      <slot name="actions" :code="code"></slot>
      <BlockActionBtn icon="copy" @click="handleCopy">
        {{ $t({ en: 'Copy', zh: '复制' }) }}
      </BlockActionBtn>
    </BlockFooter>
  </BlockWrapper>
</template>
