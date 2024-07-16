<template>
  <UIFormModal
    style="width: 780px"
    :visible="props.visible"
    :title="$t(actionMessage)"
    :body-style="{ padding: '0' }"
    @update:visible="emit('cancelled')"
  >
    <main class="main">
      <div class="sider">
        <ProcessItem
          :img-src="originalThumbnail"
          :name="$t({ en: 'Original', zh: '原图' })"
          :applied="false"
          :active="activeMethod == null"
          @click="handleMethodClick(null)"
        />
        <ProcessItem
          v-for="method in supportedMethods"
          :key="method.value"
          :img-src="method.thumbnail"
          :name="$t(method.name)"
          :applied="isMethodApplied(method.value)"
          :active="activeMethod === method.value"
          @click="handleMethodClick(method.value)"
        />
      </div>
      <div class="detail">
        <ProcessDetail v-show="activeMethod == null">
          <template #header>
            {{ $t({ en: 'Original', zh: '原图' }) }}
          </template>
          <ImgPreview
            v-for="(file, i) in files"
            :key="i"
            :file="file"
            :multiple="files.length > 1"
          />
        </ProcessDetail>
        <component
          :is="method.component"
          v-for="method in supportedMethods"
          :key="method.value"
          :active="activeMethod === method.value"
          :input="getMethodInput(method.value)"
          :applied="isMethodApplied(method.value)"
          @applied="(output) => handleMethodApplied(method.value, output)"
          @cancel="cancelMethod(method.value)"
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
              :key="costume.name"
              :costume="costume"
              :selected="isCostumeSelected(costume)"
              @click="handleCostumeClick(costume)"
            />
          </ul>
        </div>
      </div>
      <UIButton
        class="submit-btn"
        size="large"
        :disabled="selectedCostumes.length === 0"
        @click="handleConfirm"
      >
        {{ $t(actionMessage) }}
      </UIButton>
    </footer>
  </UIFormModal>
</template>

<script lang="ts" setup>
import { computed, defineProps, ref, shallowReactive, shallowRef, watch } from 'vue'
import { stripExt } from '@/utils/path'
import type { LocaleMessage } from '@/utils/i18n'
import { Costume } from '@/models/costume'
import { File } from '@/models/common/file'
import { UIButton, UIFormModal } from '@/components/ui'
import type { MethodComponent } from './common/types'
import ProcessItem from './common/ProcessItem.vue'
import ImgPreview from './common/ImgPreview.vue'
import ProcessDetail from './common/ProcessDetail.vue'
import CostumeItem from './CostumeItem.vue'
import originalThumbnail from './original-thumbnail.svg'
import SplitSpriteSheet from './split-sprite-sheet/SplitSpriteSheet.vue'
import splitSpriteSheetThumbnail from './split-sprite-sheet/thumbnail.svg'
import RemoveBackground from './remove-background/RemoveBackground.vue'
import removeBackgroundThumbnail from './remove-background/thumbnail.svg'

const props = defineProps<{
  visible: boolean
  files: File[]
  actionMessage: LocaleMessage
}>()

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
  const methods: MethodItem[] = [
    {
      value: Method.RemoveBackground,
      name: { en: 'Remove background', zh: '去除背景' },
      thumbnail: removeBackgroundThumbnail,
      component: RemoveBackground
    }
  ]

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
  outputs.push(output)
  updateCostumes(output)
}

function cancelMethod(method: Method) {
  const idx = supportedMethods.value.findIndex((m) => m.value === method)
  outputs.splice(idx)
  outputs.push(null)
  updateCostumes(getMethodInput(method))
}

const costumes = shallowRef<Costume[]>([])
const selectedCostumes = shallowReactive<Costume[]>([])

/** Update costumes based on current process output */
async function updateCostumes(files: File[]) {
  const newCostumes = await Promise.all(
    files.map((file) => Costume.create(stripExt(file.name), file))
  )
  costumes.value = newCostumes
  selectedCostumes.splice(0, selectedCostumes.length, ...newCostumes)
}

function isCostumeSelected(costume: Costume) {
  return selectedCostumes.some((a) => a.name === costume.name)
}

async function handleCostumeClick(costume: Costume) {
  const index = selectedCostumes.findIndex((c) => c.name === costume.name)
  if (index < 0) selectedCostumes.push(costume)
  else selectedCostumes.splice(index, 1)
}

function handleConfirm() {
  emit('resolved', selectedCostumes)
}

watch(
  () => props.files,
  // The first method cancelled, all methods cancelled
  () => cancelMethod(supportedMethods.value[0].value),
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
  color: --ui-color-title;
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
.submit-btn {
  width: 88px;
  height: 88px;
  :deep(.content) {
    padding: 0 10px;
    width: 100%;
    justify-content: center;
  }
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
