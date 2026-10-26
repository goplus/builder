<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { Costume } from '@/models/spx/costume'
import type { Animation } from '@/models/spx/animation'
import type { Sprite } from '@/models/spx/sprite'
import { useEditSprite } from '@/components/asset'
import { UIButton } from '@/components/ui'
import SettingsInput from '@/components/asset/gen/common/SettingsInput.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{ sprite: Sprite; resource: Costume | Animation }>()
const editorCtx = useEditorCtx()
const instruction = ref('')
const isCostume = computed(() => props.resource instanceof Costume)
const editSprite = useEditSprite()
const activate = useMessageHandle(
  async (localEdit: boolean) => {
    const text = instruction.value
    const edit = await editSprite(props.sprite, props.resource)
    const item = edit.selectedItem
    if (item == null) return
    if (item.type === 'costume') edit.setCostumeInstruction(item.id, text)
    else edit.setAnimationInstruction(item.id, text)
    if (localEdit) {
      if (editorCtx.state.spriteState != null) editorCtx.state.spriteState.aiCommenting = true
      return
    }
    if (item.type === 'costume') await edit.editCostume(item.id, text)
    else await edit.editAnimation(item.id, text)
  },
  { en: 'Failed to edit with AI', zh: '使用 AI 编辑失败' }
)
</script>

<template>
  <SettingsInput
    v-model:description="instruction"
    v-radar="{ name: 'AI edit prompt', desc: 'Describe edits to this resource' }"
    class="min-h-28! max-h-48! gap-3!"
    :placeholder="
      $t(
        isCostume
          ? { en: 'Describe changes to this costume', zh: '描述对当前造型的修改' }
          : { en: 'Describe changes to this animation', zh: '描述对当前动画的修改' }
      )
    "
    :enrichable="false"
    :disabled="activate.isLoading.value"
  >
    <template v-if="isCostume" #extra>
      <UIButton
        v-radar="{ name: 'Local edit tool', desc: 'Select locations and describe changes to them' }"
        type="white"
        icon="position"
        class="gap-1.5 px-2 text-sm"
        :disabled="activate.isLoading.value"
        @click="activate.fn(true)"
      >
        {{ $t({ en: 'Local edit', zh: '局部修改' }) }}
      </UIButton>
    </template>
    <template #submit>
      <UIButton
        v-radar="{ name: 'Edit resource', desc: 'Generate changes to this resource with AI' }"
        type="primary"
        :disabled="instruction.trim() === ''"
        :loading="activate.isLoading.value"
        @click="activate.fn(false)"
      >
        {{ $t(isCostume ? { en: 'Edit costume', zh: '修改造型' } : { en: 'Edit animation', zh: '修改动画' }) }}
      </UIButton>
    </template>
  </SettingsInput>
</template>
