<script setup lang="ts">
import { computed, watch } from 'vue'
import {
  UIForm,
  UIFormItem,
  UITextInput,
  UIButton,
  UIFormModal,
  UIRadio,
  UIRadioGroup,
  UILoading,
  UIError,
  useForm,
  useConfirmDialog
} from '@/components/ui'
import { type AssetData, addAsset, listAsset, Visibility, AssetType, getAsset, updateAsset } from '@/apis/asset'
import { useMessageHandle } from '@/utils/exception'
import { Backdrop } from '@/models/backdrop'
import { Sound } from '@/models/sound'
import { Sprite } from '@/models/sprite'
import { validateAssetDisplayName, getAssetDisplayNameTip } from '@/models/common/asset-name'
import type { AssetModel, PartialAssetData } from '@/models/common/asset'
import { backdrop2Asset, sound2Asset, sprite2Asset } from '@/models/common/asset'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import { useSignedInUser } from '@/stores/user'
import { categoryAll, getAssetCategories } from './category'
import BackdropPreview from './BackdropPreview.vue'
import SpritePreview from './SpritePreview.vue'
import SoundPreview from './SoundPreview.vue'

const props = defineProps<{
  visible: boolean
  model: AssetModel
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const { data: signedInUser } = useSignedInUser()

const user = computed(() => {
  const u = signedInUser.value
  if (u == null) throw new Error('user is not signed in')
  return u
})

const advancedLibraryEnabled = computed(() => user.value.capabilities.canManageAssets)

const { t } = useI18n()

const {
  data: existedAsset,
  isLoading,
  error,
  refetch
} = useQuery(
  async () => {
    if (!advancedLibraryEnabled.value) return null
    const metadata = props.model.assetMetadata
    if (metadata == null || metadata.id == null || metadata.owner !== user.value.username) return null
    return getAsset(metadata.id).catch((e) => {
      console.warn('failed to get existed asset', e)
      return null
    })
  },
  {
    en: 'Failed to check existed asset',
    zh: '查找已存在素材失败'
  }
)

const assetType = computed(() => {
  if (props.model instanceof Backdrop) return AssetType.Backdrop
  if (props.model instanceof Sound) return AssetType.Sound
  if (props.model instanceof Sprite) return AssetType.Sprite
  throw new Error(`unknown asset type ${props.model}`)
})

const categories = computed(() => getAssetCategories(assetType.value))

enum Action {
  /** Save by updating existed asset */
  Update = 'update',
  /** Save by creating new asset */
  Create = 'create'
}

const form = useForm({
  name: [props.model.name, (n) => t(validateAssetDisplayName(n) ?? null)],
  category: [categoryAll.value],
  action: [Action.Create]
})

watch(existedAsset, (ea) => {
  if (ea == null) return
  form.value.name = ea.displayName
  form.value.category = ea.category
  form.value.action = Action.Update
})

const confirm = useConfirmDialog()

const handleSubmit = useMessageHandle(
  async () => {
    let params: PartialAssetData
    if (props.model instanceof Backdrop) {
      params = await backdrop2Asset(props.model)
    } else if (props.model instanceof Sound) {
      params = await sound2Asset(props.model)
    } else if (props.model instanceof Sprite) {
      params = await sprite2Asset(props.model)
    } else {
      throw new Error(`unknown asset type ${props.model}`)
    }

    let saved: AssetData
    if (existedAsset.value != null && form.value.action === Action.Update) {
      const { id, visibility, description, extraSettings } = existedAsset.value
      saved = await updateAsset(id, {
        displayName: form.value.name,
        type: params.type,
        category: form.value.category,
        description,
        extraSettings,
        files: params.files,
        filesHash: params.filesHash,
        visibility
      })
    } else {
      saved = await addAssetWithParams(params)
    }
    const { files, ...metadata } = saved
    props.model.setAssetMetadata(metadata)
    emit('resolved')
    return saved
  },
  { en: 'Failed to save asset', zh: '保存失败' },
  (asset) => ({ en: `Asset ${asset.displayName} saved`, zh: `素材 ${asset.displayName} 保存成功` })
)

async function addAssetWithParams(params: PartialAssetData) {
  const { data: assets } = await listAsset({
    pageSize: 1, // we only need to know if the asset with the same filesHash exists
    pageIndex: 1,
    type: params.type,
    filesHash: params.filesHash,
    orderBy: 'createdAt',
    sortOrder: 'desc'
  })
  if (assets.length) {
    let assetTypeName = t({ en: 'asset', zh: '素材' })
    switch (params.type) {
      case AssetType.Sprite:
        assetTypeName = t({ en: 'sprite', zh: '精灵' })
        break
      case AssetType.Backdrop:
        assetTypeName = t({ en: 'backdrop', zh: '背景' })
        break
      case AssetType.Sound:
        assetTypeName = t({ en: 'sound', zh: '声音' })
        break
    }
    await confirm({
      type: 'warning',
      title: t({
        en: `Duplicate ${assetTypeName} confirmation`,
        zh: `${assetTypeName}重复确认`
      }),
      content: t({
        en: `The ${assetTypeName} you uploaded [${form.value.name}] is the same as the existing ${assetTypeName} [${assets[0].displayName}] in the asset library. Are you sure you want to add this ${assetTypeName} to the asset library?`,
        zh: `你上传的${assetTypeName}「${form.value.name}」与已存在于素材库中的${assetTypeName}「${assets[0].displayName}」内容相同。是否确认需要将此${assetTypeName}添加到素材库中？`
      })
    })
  }

  return addAsset({
    ...params,
    displayName: form.value.name,
    category: form.value.category,
    // TODO: Save with proper description and extra settings
    description: '',
    extraSettings: {},
    visibility: Visibility.Private
  })
}
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Asset save modal', desc: 'Modal for saving assets to the asset library' }"
    :title="$t({ en: 'Save to asset library', zh: '保存到素材库' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <UILoading :visible="isLoading" cover />
    <UIError v-if="error != null" :retry="refetch">
      {{ $t(error.userMessage) }}
    </UIError>
    <UIForm v-else :form="form" @submit="handleSubmit.fn">
      <main class="main">
        <div class="sider">
          <BackdropPreview v-if="model instanceof Backdrop" class="preview" :backdrop="model" />
          <SpritePreview v-if="model instanceof Sprite" class="preview" :sprite="model" />
          <SoundPreview v-if="model instanceof Sound" class="preview" :sound="model" />
        </div>
        <div class="inputs">
          <UIFormItem path="name">
            <UITextInput
              v-model:value="form.value.name"
              v-radar="{ name: 'Asset name input', desc: 'Input field for asset display name' }"
            />
            <template #tip>{{ $t(getAssetDisplayNameTip()) }}</template>
          </UIFormItem>
          <UIFormItem v-if="advancedLibraryEnabled" :label="$t({ en: 'Category', zh: '类别' })" path="category">
            <UIRadioGroup v-model:value="form.value.category">
              <UIRadio v-for="c in categories" :key="c.value" :value="c.value" :label="$t(c.message)" />
            </UIRadioGroup>
          </UIFormItem>
          <UIFormItem
            v-if="advancedLibraryEnabled && existedAsset != null"
            :label="$t({ en: 'Save Action', zh: '保存行为' })"
            path="mode"
          >
            <UIRadioGroup v-model:value="form.value.action">
              <UIRadio
                :value="Action.Update"
                :label="
                  $t({
                    en: `Update existed asset (${existedAsset.displayName})`,
                    zh: `更新已有素材（${existedAsset.displayName}）`
                  })
                "
              />
              <UIRadio :value="Action.Create" :label="$t({ en: 'Create new asset', zh: '创建新素材' })" />
            </UIRadioGroup>
          </UIFormItem>
        </div>
      </main>
      <footer class="footer">
        <UIButton
          v-radar="{ name: 'Save button', desc: 'Click to save asset to the library' }"
          color="primary"
          html-type="submit"
          :disabled="isLoading"
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
