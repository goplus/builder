<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import type { SpriteResourceGen } from '@/models/spx/gen/sprite-resource-gen'
import { UIButton, UIEmpty, UIError, UIIcon, UIImg, useConfirmDialog } from '@/components/ui'
import { humanizeTimeLeft } from '@/components/asset/gen/common/time-left'
import GenLoading from '@/components/asset/gen/common/GenLoading.vue'
import GenStateFailed from '@/components/asset/gen/common/GenStateFailed.vue'
import CostumeSettingsInput from '@/components/asset/gen/costume/CostumeSettingsInput.vue'
import AnimationSettingsInput from '@/components/asset/gen/animation/AnimationSettingsInput.vue'
import AnimationVideoPreview from '@/components/asset/gen/animation/AnimationVideoPreview.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  draft: SpriteResourceGen
  /** A prop rather than an event: adoption removes the draft and unmounts this detail, and Vue drops events emitted after unmount. */
  onAdopted?: (id: string) => void
}>()
const editor = useEditorCtx()
const gen = computed(() => props.draft.gen)
const phase = computed(() => (gen.value instanceof CostumeGen ? gen.value.generateState : gen.value.generateVideoState))
const [image, loadingImage] = useRenderableImageUrl(() => (gen.value instanceof CostumeGen ? gen.value.image : null))
const adopt = useMessageHandle(
  async () => {
    const resource = await editor.state.genState.spriteResources.adopt(props.draft, editor.state.history)
    props.onAdopted?.(resource.id)
  },
  { en: 'Failed to add resource', zh: '添加资源失败' }
)
const { t } = useI18n()
const confirm = useConfirmDialog()
const discard = useMessageHandle(async () => {
  const draft = props.draft
  await confirm({
    type: 'warning',
    title: t({ en: 'Discard generated versions?', zh: '放弃生成结果？' }),
    content: t({
      en: `All generated versions of "${draft.gen.name}" will be removed.`,
      zh: `将移除“${draft.gen.name}”的所有生成结果。`
    }),
    confirmText: t({ en: 'Discard', zh: '放弃' })
  })
  draft.discard()
}).fn
const canAdopt = computed(
  () => props.draft.hasMedia && (gen.value instanceof CostumeGen || gen.value.framesConfig != null)
)
</script>

<template>
  <div class="flex flex-1 min-h-0 min-w-0 flex-col items-center gap-3 overflow-y-auto bg-grey-200 p-4">
    <div class="flex h-8 w-full shrink-0 items-center justify-between">
      <template v-if="draft.versions.length > 0">
        <div class="flex items-center gap-2">
          <UIButton
            v-radar="{ name: 'previous-version', desc: 'Show the previous generation' }"
            type="white"
            shape="square"
            size="medium"
            :disabled="draft.busy || draft.index < 0"
            @click="draft.previousVersion()"
          >
            <template #icon><UIIcon type="angleLeft" /></template>
          </UIButton>
          <span class="text-sm text-text tabular-nums" aria-live="polite">{{
            $t(
              draft.index < 0
                ? { en: 'Not generated', zh: '未生成' }
                : { en: `Version ${draft.index + 1}`, zh: `第 ${draft.index + 1} 版` }
            )
          }}</span>
          <UIButton
            v-radar="{ name: 'next-version', desc: 'Show the next generation' }"
            type="white"
            shape="square"
            size="medium"
            :disabled="draft.busy || draft.index >= draft.versions.length - 1"
            @click="draft.nextVersion()"
          >
            <template #icon><UIIcon type="angleLeft" class="rotate-180" /></template>
          </UIButton>
        </div>
        <div class="flex gap-2">
          <UIButton
            v-radar="{ name: 'discard-results', desc: 'Discard generated versions' }"
            type="white"
            class="border-transparent! bg-transparent"
            size="medium"
            :disabled="draft.busy"
            @click="discard"
            >{{ $t({ en: 'Discard', zh: '放弃' }) }}</UIButton
          >
          <UIButton
            v-radar="{ name: 'apply-result', desc: 'Use this version in the sprite' }"
            type="primary"
            size="medium"
            :disabled="draft.busy || !canAdopt"
            :loading="adopt.isLoading.value"
            @click="adopt.fn"
            >{{ $t({ en: 'Apply', zh: '采用' }) }}</UIButton
          >
        </div>
      </template>
    </div>
    <div class="relative w-full max-w-160 min-h-32 flex-1 overflow-hidden rounded-md">
      <GenStateFailed v-if="phase.status === 'failed'" :state-failed="phase" />
      <template v-else>
        <UIImg
          v-if="gen instanceof CostumeGen && image != null"
          class="h-full w-full"
          :src="image"
          :loading="loadingImage"
        />
        <AnimationVideoPreview
          v-else-if="!(gen instanceof CostumeGen) && gen.video != null"
          :key="draft.index"
          controls-below
          :inert="adopt.isLoading.value || gen.finishState.status === 'running'"
          :video="gen.video"
          :frames-config="gen.framesConfig"
          @update:frames-config="gen.setFramesConfig($event)"
        />
        <UIEmpty v-else-if="phase.status === 'initial'" size="large" img="box"><template #default /></UIEmpty>
        <GenLoading
          footer
          :visible="phase.status === 'running'"
          :completed="phase.status === 'finished'"
          :playable="!(gen instanceof CostumeGen)"
          cover
        >
          {{
            $t(
              gen instanceof CostumeGen
                ? { en: 'Generating a costume…', zh: '正在生成造型…' }
                : { en: 'Generating an animation…', zh: '正在生成动画…' }
            )
          }}
          {{ phase.status === 'running' && phase.timeLeft != null ? $t(humanizeTimeLeft(phase.timeLeft)) : '' }}
        </GenLoading>
        <GenLoading v-if="gen.finishState.status === 'running'" cover footer>{{
          $t({ en: 'Saving…', zh: '正在保存…' })
        }}</GenLoading>
        <UIError
          v-else-if="gen.finishState.status === 'failed'"
          cover
          :retry="adopt.fn"
          :back="() => gen.resetFinishState()"
          >{{ $t(gen.finishState.error.userMessage) }}</UIError
        >
      </template>
    </div>
    <div class="w-full max-w-160 shrink-0" :inert="adopt.isLoading.value">
      <p
        v-if="draft.suggested && draft.versions.length === 0 && phase.status === 'initial'"
        class="mb-2 text-center text-sm text-hint-2"
      >
        {{
          $t(
            gen instanceof CostumeGen
              ? {
                  en: 'AI suggested adding this costume. You can edit the description below.',
                  zh: '这是 AI 建议添加的造型，你可以修改下方描述。'
                }
              : {
                  en: 'AI suggested adding this animation. You can edit the description below.',
                  zh: '这是 AI 建议添加的动画，你可以修改下方描述。'
                }
          )
        }}
      </p>
      <CostumeSettingsInput v-if="gen instanceof CostumeGen" :gen="gen" />
      <AnimationSettingsInput v-else :gen="gen" />
    </div>
  </div>
</template>
