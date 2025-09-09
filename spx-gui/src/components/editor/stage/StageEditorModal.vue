<template>
  <UIFullScreenModal :visible="visible" @update:visible="handleUpdateVisible">
    <div class="stage-editor">
      <header class="header">
        <div class="title">
          {{ $t({ en: 'Map editor', zh: '地图编辑器' }) }}
        </div>
        <div class="actions">
          <UIModalClose class="close" size="large" @click="handleCancel" />
        </div>
      </header>
      <div class="body">
        <div class="left">
          <div class="preview">
            <StageMapPreview :project="project" :selected-sprite="selectedSprite" />
          </div>
        </div>
        <div class="right">
          <UIForm id="stage-editor-form" :form="form" @submit="handleSubmit.fn">
            <section class="section">
              <h3 class="section-title">{{ $t({ en: 'Map', zh: '地图' }) }}</h3>
              <div class="row">
                <UIFormItem :label="$t({ en: 'Map Width', zh: '地图宽度' })" path="width">
                  <UINumberInput
                    v-model:value="form.value.width"
                    v-radar="{ name: 'Stage width input', desc: 'Set stage map width' }"
                    :min="1"
                    :max="10000"
                  />
                </UIFormItem>
                <UIFormItem :label="$t({ en: 'Map Height', zh: '地图高度' })" path="height">
                  <UINumberInput
                    v-model:value="form.value.height"
                    v-radar="{ name: 'Stage height input', desc: 'Set stage map height' }"
                    :min="1"
                    :max="10000"
                  />
                </UIFormItem>
              </div>
              <div class="row">
                <UIFormItem :label="$t({ en: 'Physics Engine', zh: '物理引擎' })" path="physics">
                  <UIButtonGroup
                    :value="'enabled'"
                    type="text"
                  >
                    <UIButtonGroupItem :value="'enabled'">
                      {{ $t({ en: 'Enabled', zh: '启用' }) }}
                    </UIButtonGroupItem>
                    <UIButtonGroupItem :value="'disabled'">
                      {{ $t({ en: 'Disabled', zh: '禁用' }) }}
                    </UIButtonGroupItem>
                  </UIButtonGroup>
                </UIFormItem>
              </div>
            </section>
          </UIForm>
          <section class="section">
            <h3 class="section-title">{{ $t({ en: 'Sprites', zh: '精灵' }) }}</h3>
            <div class="sprites">
              <SpriteItem
                v-for="sprite in project.sprites"
                :key="sprite.id"
                :sprite="sprite"
                :selectable="{ selected: sprite === selectedSprite }"
                operable
                droppable
                @click="handleSpriteClick(sprite)"
              />
            </div>
          </section>
          <section v-if="selectedSprite != null" class="section">
            <SpriteBasicConfig :sprite="selectedSprite" :project="project" />
          </section>
        </div>
      </div>
    </div>
  </UIFullScreenModal>
  
</template>

<script setup lang="ts">
import { UIButton, UIFullScreenModal, UIModalClose, UIForm, UIFormItem, UINumberInput, UIButtonGroup, UIButtonGroupItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { type Project } from '@/models/project'
import { useForm } from '@/components/ui/form/ctrl'
import { useI18n } from '@/utils/i18n'
import StageMapPreview from './StageMapPreview.vue'
import { EditorState } from '@/components/editor/editor-state'
import SpriteBasicConfig from '@/components/editor/panels/sprite/config/SpriteBasicConfig.vue'
import SpriteItem from '@/components/editor/sprite/SpriteItem.vue'
import { computed, ref } from 'vue'
import type { Sprite } from '@/models/sprite'

const props = defineProps<{
  visible: boolean
  project: Project
}>()

const emit = defineEmits<{
  resolved: []
  cancelled: []
}>()

function handleCancel() {
  emit('cancelled')
}

function handleUpdateVisible(visible: boolean) {
  if (!visible) emit('cancelled')
}

const form = useForm({
  width: [props.project.stage.mapWidth, validatePositiveInt],
  height: [props.project.stage.mapHeight, validatePositiveInt]
})

const { t } = useI18n()

function validatePositiveInt(v: number | null) {
  if (v == null) return t({ en: 'Required', zh: '必填' })
  if (!Number.isInteger(v) || v <= 0) return t({ en: 'Enter a positive integer', zh: '请输入正整数' })
  return null
}

const handleSubmit = useMessageHandle(async () => {
  const action = { name: { en: 'Update stage size', zh: '更新舞台尺寸' } }
  await props.project.history.doAction(action, () => {
    props.project.stage.setMapWidth(form.value.width as number)
    props.project.stage.setMapHeight(form.value.height as number)
  })
  emit('resolved')
})

const selectedSpriteIdRef = ref<string | null>(null)
const selectedSprite = computed(() => props.project.sprites.find(sprite => sprite.id === selectedSpriteIdRef.value) ?? null)

function handleSpriteClick(sprite: Sprite) {
  selectedSpriteIdRef.value = sprite.id
}
</script>

<style scoped lang="scss">
.stage-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: white;

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--ui-color-grey-400);
  }

  .title {
    color: var(--ui-color-title);
    font-size: 18px;
    font-weight: 600;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .body {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 24px;
    background-color: var(--ui-color-grey-200);
    gap: 24px;
  }
}

.left {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: var(--ui-border-radius-1);
  overflow: hidden;
}

.right {
  flex: 0 0 328px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: white;
  border-radius: var(--ui-border-radius-1);
  padding: 16px 20px 20px;
  min-width: 240px;
}

.section-title {
  font-size: 16px;
  color: var(--ui-color-grey-900);
}

.sprites {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
}

.row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.preview {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
}
</style>
