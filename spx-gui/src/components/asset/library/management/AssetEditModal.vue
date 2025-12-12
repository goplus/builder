<script setup lang="ts">
import { computed } from 'vue'
import { UIForm, UIFormItem, UITextInput, UIButton, UIFormModal, UIRadio, UIRadioGroup, useForm } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { type AssetData, AssetType, updateAsset } from '@/apis/asset'
import { validateAssetDisplayName } from '@/models/common/asset-name'
import { getAssetCategories } from '../category'
import BackdropPreview from '../BackdropPreview.vue'
import SpritePreview from '../SpritePreview.vue'
import SoundPreview from '../SoundPreview.vue'

const props = defineProps<{
  visible: boolean
  asset: AssetData
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const { t } = useI18n()

const assetType = computed(() => props.asset.type)

const categories = computed(() => getAssetCategories(assetType.value))

const form = useForm({
  name: [props.asset.displayName, (n) => t(validateAssetDisplayName(n) ?? null)],
  category: [props.asset.category]
})

const handleSubmit = useMessageHandle(
  async () => {
    const asset = props.asset
    await updateAsset(asset.id, {
      ...asset,
      displayName: form.value.name,
      category: form.value.category
    })
    emit('resolved')
  },
  { en: 'Failed to save asset', zh: '保存失败' }
)
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Asset edit modal', desc: 'Modal for editing asset in the library' }"
    :title="$t({ en: 'Update asset library', zh: '更新素材' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <UIForm :form="form" @submit="handleSubmit.fn">
      <main class="main">
        <div class="sider">
          <BackdropPreview v-if="assetType === AssetType.Backdrop" class="preview" :backdrop="asset" />
          <SpritePreview v-if="assetType === AssetType.Sprite" class="preview" :sprite="asset" />
          <SoundPreview v-if="assetType === AssetType.Sound" class="preview" :sound="asset" />
        </div>
        <div class="inputs">
          <UIFormItem path="name">
            <UITextInput
              v-model:value="form.value.name"
              v-radar="{ name: 'Asset name input', desc: 'Input field for asset display name' }"
            />
          </UIFormItem>
          <UIFormItem :label="$t({ en: 'Category', zh: '类别' })" path="category">
            <UIRadioGroup v-model:value="form.value.category">
              <UIRadio v-for="c in categories" :key="c.value" :value="c.value" :label="$t(c.message)" />
            </UIRadioGroup>
          </UIFormItem>
        </div>
      </main>
      <footer class="footer">
        <UIButton
          v-radar="{ name: 'Save button', desc: 'Click to save asset changes' }"
          color="primary"
          html-type="submit"
          :loading="handleSubmit.isLoading.value"
        >
          {{ $t({ en: 'Save', zh: '保存' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

<style scoped lang="scss">
.main {
  display: flex;
}

.sider {
  flex: 0 0 auto;
  padding: 20px 24px;

  .preview {
    width: 112px;
    height: 84px;
    border-radius: 8px;
    background-color: var(--ui-color-grey-300);
  }
}

.inputs {
  flex: 1 1 0;
  padding: 20px 24px 40px;
}

.footer {
  display: flex;
  justify-content: center;
}
</style>
