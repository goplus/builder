<template>
  <UIFormModal
    :title="$t({ en: 'Rename', zh: '重命名' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <UIForm :form="form" @submit="handleSubmit">
      <main class="main">
        <div class="inputs">
          <UIFormItem path="name">
            <UITextInput v-model:value="form.value.name" />
            <template #tip>{{ $t(nameTip) }}</template>
          </UIFormItem>
          <!-- Add a radio group for the asset category/isPublic -->
        </div>
      </main>
      <footer class="footer">
        <UIButton type="primary" html-type="submit">
          {{ $t({ en: 'Confirm', zh: '确认' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

<script setup lang="ts">
import {
  UIForm,
  UIFormItem,
  UITextInput,
  UIButton,
  UIFormModal,
  useForm} from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { categoryAll } from './category'
import { exportedId, isContentReady, type TaggedAIAssetData } from '@/apis/aigc'
import { addAsset, getAsset, IsPublic, type AddAssetParams, type AssetData } from '@/apis/asset'
import { ref } from 'vue'
import { removeAssetFromFavorites, addAssetToFavorites } from '@/apis/user'

const props = defineProps<{
  visible: boolean
  asset: TaggedAIAssetData
  isFavorite: boolean
  prompt?: string
}>()

const emit = defineEmits<{
  changed: [string]
  cancelled: []
  resolved: []
}>()

const { t } = useI18n()
const publicAsset = ref<AssetData | null>(null)

const form = useForm({
  name: [props.asset.displayName!, validateName],
  category: [categoryAll.value],
})


const nameTip = {
  en: 'A good name makes it easy to be found in asset library.',
  zh: '起一个准确的名字，可以帮助你下次更快地找到它'
}

const handleSubmit = async()=>{
  if(form.value.name !== props.asset.displayName){
    const handleToggleFav = async () => {
  if (!publicAsset.value) {
    const exportedAsset = await exportAssetDataToPublic(form.value.name)
    publicAsset.value = exportedAsset
  }
  if (props.isFavorite) {
    removeAssetFromFavorites(props.asset.id)
  } else {
    addAssetToFavorites(props.asset.id)
  }
}
await handleToggleFav()
    emit('resolved')
  }else{
    emit('cancelled')
  }
}

/**
 * Get the public asset data from the asset data
 * If the asset data is not exported, export it first
 */
 const exportAssetDataToPublic = async (name:string) => {
  if (!props.asset[isContentReady]) {
    throw new Error('Could not export an incomplete asset')
  }
  // let addAssetParam = props.asset
  let addAssetParam:AddAssetParams = {
    ...props.asset,
    isPublic: IsPublic.public,
    files: props.asset.files!,
    displayName: name,
    filesHash: props.asset.filesHash!,
    preview: "TODO",
    category: '*',
    prompt: props.prompt,
  }
  const assetId = props.asset[exportedId] ?? (await addAsset(addAssetParam)).id
  const publicAsset = await getAsset(assetId)
  return publicAsset
}

function validateName(name: string) {
  name = name.trim()
  if (name === '') return t({ en: 'The asset name must not be blank', zh: '名称不可为空' })
  if (name.length > 100)
    return t({
      en: 'The name is too long (maximum is 100 characters)',
      zh: '名字长度超出限制（最多 100 个字符）'
    })
}
</script>

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
