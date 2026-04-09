<script setup lang="ts">
import { computed } from 'vue'
import { UIForm, UIFormItem, UITextInput, UIButton, UIFormModal, UIRadio, UIRadioGroup, useForm } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { type AssetData, AssetType, updateAsset } from '@/apis/asset'
import { validateAssetDisplayName } from '@/models/spx/common/asset-name'
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
      <main class="flex">
        <div class="flex-none px-6 py-5">
          <BackdropPreview
            v-if="assetType === AssetType.Backdrop"
            class="h-21 w-28 rounded-sm bg-grey-300"
            :backdrop="asset"
          />
          <SpritePreview
            v-if="assetType === AssetType.Sprite"
            class="h-21 w-28 rounded-sm bg-grey-300"
            :sprite="asset"
          />
          <SoundPreview v-if="assetType === AssetType.Sound" class="h-21 w-28 rounded-sm bg-grey-300" :sound="asset" />
        </div>
        <div class="flex-[1_1_0] px-6 pt-5 pb-10">
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
      <footer class="flex justify-center">
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
