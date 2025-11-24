<template>
  <UIFormModal
    :radar="{
      name: 'Preprocess modal',
      desc: 'Modal for preprocessing image for costumes. This modal allows users to apply various preprocessing methods to images before creating costumes with them.'
    }"
    style="width: 780px"
    :visible="props.visible && ready"
    :title="$t(title)"
    :body-style="{ padding: '0' }"
    @update:visible="emit('cancelled')"
  >
    <main class="main">
      <div
        v-radar="{
          name: 'Preprocessing method entries',
          desc: 'Sidebar which contains entries for preprocessing methods'
        }"
        class="sider"
      >
        <ProcessItem
          v-radar="{
            name: 'Original image',
            desc: 'Click to view the original image before any processing'
          }"
          :img-src="originalThumbnail"
          :name="$t({ en: 'Original', zh: '原图' })"
          :applied="false"
          :active="activeMethod == null"
          @click="handleMethodClick(null)"
        />
        <ProcessItem
          v-for="method in supportedMethods"
          :key="method.value"
          v-radar="{
            name: method.name.en,
            desc: `Click to configure preprocessing method: ${method.name.en}`
          }"
          :img-src="method.thumbnail"
          :name="$t(method.name)"
          :applied="isMethodApplied(method.value)"
          :active="activeMethod === method.value"
          @click="handleMethodClick(method.value)"
        />
      </div>
      <div class="detail">
        <!-- Use `v-show` instead of `v-if` to avoid exception. See details in https://github.com/goplus/builder/issues/2022 -->
        <ProcessDetail
          v-show="activeMethod == null"
          v-radar="{
            name: 'Original image',
            desc: 'Click to view the original image before any processing'
          }"
        >
          <template #header>
            {{ $t({ en: 'Original', zh: '原图' }) }}
          </template>
          <ImgPreview v-for="(file, i) in files" :key="i" :file="file" :multiple="files.length > 1" />
        </ProcessDetail>
        <component
          :is="method.component"
          v-for="method in supportedMethods"
          :key="method.value"
          v-radar="{
            name: method.name.en,
            desc: `Configure panel for preprocessing method: ${method.name.en}`
          }"
          :active="activeMethod === method.value"
          :input="getMethodInput(method.value)"
          :applied="isMethodApplied(method.value)"
          @applied="(output) => handleMethodApplied(method.value, output)"
          @cancel="handleMethodCancel(method.value)"
        />
      </div>
    </main>
    <footer class="footer">
      <div class="footer-main">
        <h4 class="footer-title">{{ $t({ en: 'Costumes', zh: '造型' }) }}</h4>
        <div class="costume-wrapper">
          <ul class="costume-list">
            <CostumeItem
              v-for="costume in costumes"
              :key="costume.id"
              :costume="costume"
              :checked="isCostumeSelected(costume)"
              @click="handleCostumeClick(costume)"
            />
          </ul>
        </div>
      </div>
      <UIButton
        v-radar="{ name: 'Confirm button', desc: 'Click to confirm preprocessing' }"
        size="large"
        :disabled="selectedCostumes.length === 0"
        :loading="handleConfirm.isLoading.value"
        @click="handleConfirm.fn"
      >
        {{ $t(confirmText) }}
      </UIButton>
    </footer>
  </UIFormModal>
</template>

<script lang="ts" setup>
import { computed, ref, shallowReactive, shallowRef, watch } from 'vue'
import { stripExt } from '@/utils/path'
import type { LocaleMessage } from '@/utils/i18n'
import { disableAIGC } from '@/utils/env'
import { Costume } from '@/models/costume'
import { File } from '@/models/common/file'
import { UIButton, UIFormModal } from '@/components/ui'
import type { MethodComponent } from './common/types'
import ProcessItem from './common/ProcessItem.vue'
import ImgPreview from './common/ImgPreview.vue'
import ProcessDetail from './common/ProcessDetail.vue'
import CostumeItem from '@/components/editor/sprite/CheckableCostumeItem.vue'
import originalThumbnail from './original-thumbnail.svg'
import SplitSpriteSheet from './split-sprite-sheet/SplitSpriteSheet.vue'
import splitSpriteSheetThumbnail from './split-sprite-sheet/thumbnail.png'
import RemoveBackground from './remove-background/RemoveBackground.vue'
import removeBackgroundThumbnail from './remove-background/thumbnail.svg'
import { saveFiles } from '@/models/common/cloud'
import { useMessageHandle } from '@/utils/exception'
import { useNetwork } from '@/utils/network'

const { isOnline } = useNetwork()

const props = withDefaults(
  defineProps<{
    visible: boolean
    files: File[]
    title: LocaleMessage
    confirmText?: LocaleMessage
  }>(),
  {
    confirmText: () => ({ en: 'Confirm', zh: '确认' })
  }
)

const emit = defineEmits<{
  cancelled: []
  resolved: [Costume[]]
}>()

/** Process method */
enum Method {
  SplitSpriteSheet = 'SplitSpriteSheet',
  RemoveBackground = 'RemoveBackground'
}

type MethodItem = {
  value: Method
  name: LocaleMessage
  thumbnail: string
  component: MethodComponent
}

/**
 * All supported methods for preprocessing.
 * The order of methods is the order of applying.
 */
const supportedMethods = computed(() => {
  const methods: MethodItem[] = []

  if (!disableAIGC) {
    methods.push({
      value: Method.RemoveBackground,
      name: { en: 'Remove background', zh: '去除背景' },
      thumbnail: removeBackgroundThumbnail,
      component: RemoveBackground
    })
  }

  if (props.files.length === 1) {
    methods.push({
      value: Method.SplitSpriteSheet,
      name: { en: 'Split sprite sheet', zh: '切分精灵表' },
      thumbnail: splitSpriteSheetThumbnail,
      component: SplitSpriteSheet
    })
  }

  return methods
})

const activeMethod = ref<Method | null>(null)
function handleMethodClick(method: Method | null) {
  activeMethod.value = method
}

type Output = File[]

/**
 * Outputs for supportedMethods.
 * If the method is not applied, the corresponding output is `null`.
 * The output of the previous method is the input of the next method.
 */
const outputs = shallowReactive<Array<Output | null>>([])

function getMethodInput(method: Method): File[] {
  const idx = supportedMethods.value.findIndex((m) => m.value === method)
  for (let i = idx - 1; i >= 0; i--) {
    const output = outputs[i]
    if (output != null) return output
  }
  return props.files
}

function isMethodApplied(method: Method) {
  const idx = supportedMethods.value.findIndex((m) => m.value === method)
  return outputs[idx] != null
}

function handleMethodApplied(method: Method, output: File[]) {
  const idx = supportedMethods.value.findIndex((m) => m.value === method)
  // methods are applied in order, so we need to unapply the following methods, as thier inputs have changed
  outputs.splice(idx)
  outputs[idx] = output
  updateCostumes(output)
}

function handleMethodCancel(method: Method) {
  const idx = supportedMethods.value.findIndex((m) => m.value === method)
  outputs.splice(idx)
  outputs[idx] = null
  updateCostumes(getMethodInput(method))
}

function resetOutputs() {
  outputs.splice(0)
  updateCostumes(props.files)
}

const costumes = shallowRef<Costume[]>([])
const selectedCostumes = shallowReactive<Costume[]>([])

/** Update costumes based on current process output */
async function updateCostumes(files: File[]) {
  const newCostumes = await Promise.all(
    files.map(async (file) => {
      const costume = await Costume.create(stripExt(file.name), file)
      await costume.autoFit()
      return costume
    })
  )
  costumes.value = newCostumes
  selectedCostumes.splice(0, selectedCostumes.length, ...newCostumes)
}

function isCostumeSelected(costume: Costume) {
  return selectedCostumes.some((a) => a.id === costume.id)
}

async function handleCostumeClick(costume: Costume) {
  const index = selectedCostumes.findIndex((c) => c.id === costume.id)
  if (index < 0) selectedCostumes.push(costume)
  else selectedCostumes.splice(index, 1)
}

const handleConfirm = useMessageHandle(
  async () => {
    if (isOnline.value) {
      const files = selectedCostumes
        .map((costume) =>
          costume.export({
            basePath: ''
          })
        )
        .reduce((acc, [, files]) => ({ ...acc, ...files }), {})
      await saveFiles(files)
    }
    emit('resolved', selectedCostumes)
  },
  {
    en: 'Failed to upload files',
    zh: '上传文件失败'
  }
)

// Avoid UI flickering when there's no supported methods
const ready = ref(false)

watch(
  () => props.files,
  async (files) => {
    // If there's no supported methods, skip user interaction and resolve with costumes created with original files
    if (supportedMethods.value.length === 0) {
      await updateCostumes(files)
      emit('resolved', costumes.value)
      return
    }

    ready.value = true
    resetOutputs()
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.main {
  height: 475px;
  display: flex;
  align-items: stretch;
}
.footer {
  padding: 16px;
  display: flex;
  gap: 20px;
  align-items: flex-end;
  border-right: 1px solid var(--ui-color-dividing-line-2);
  box-shadow: 0px -2px 12px 0px rgba(51, 51, 51, 0.08);
}
.footer-main {
  flex: 1 1 0;
  min-width: 0;

  // negative margin & fixed height to allow optional scrollbar of .costume-wrapper
  height: 135px;
  margin-bottom: -16px;
}
.footer-title {
  color: var(--ui-color-title);
}
.costume-wrapper {
  width: 100%;
  padding-top: 9px;
  overflow-x: auto;
  scrollbar-width: thin;
}
.costume-list {
  display: flex;
  gap: 8px;
}
.sider {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  gap: 12px;
  border-right: 1px solid var(--ui-color-dividing-line-2);
}
.detail {
  flex: 1 1 0;
  min-width: 0;
}
</style>
