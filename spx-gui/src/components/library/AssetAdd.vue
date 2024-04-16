<template>
  <UIForm :form="form" @submit="handleSubmit">
    <UIFormItem :label="$t({ en: 'Asset Name', zh: '素材名' })" path="name">
      <UITextInput v-model:value="form.value.name" />
    </UIFormItem>
    <UIFormItem :label="$t({ en: 'Category', zh: '素材类别' })" path="category">
      <NRadioGroup v-model:value="form.value.category">
        <NSpace>
          <NRadio v-for="c in categories" :key="c.value" :value="c.value" :label="$t(c.message)" />
        </NSpace>
      </NRadioGroup>
    </UIFormItem>
    <UIFormItem
      :label="$t({ en: 'Publish to public assets', zh: '发布到公共素材库' })"
      path="isPublic"
    >
      <NCheckbox v-model:checked="form.value.isPublic" />
    </UIFormItem>
    <UIFormItem>
      <UIButton type="boring" @click="handleCancel">
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton type="primary" html-type="submit">
        {{ $t({ en: 'Create', zh: '创建' }) }}
      </UIButton>
    </UIFormItem>
  </UIForm>
</template>

<script setup lang="ts">
import { NRadioGroup, NRadio, NSpace, NCheckbox } from 'naive-ui'
import { UIForm, UIFormItem, UITextInput, UIButton, useForm } from '@/components/ui'
import { type AssetData, addAsset as apiAddAsset, IsPublic } from '@/apis/asset'
import { useMessageHandle } from '@/utils/exception'
import { Backdrop } from '@/models/backdrop'
import { Sound } from '@/models/sound'
import { Sprite } from '@/models/sprite'
import type { PartialAssetData } from '@/models/common/asset'
import { categories, categoryAll } from './category'
import { backdrop2Asset, sound2Asset, sprite2Asset } from '@/models/common/asset'
import { useI18n } from '@/utils/i18n'

const props = defineProps<{
  asset: Backdrop | Sound | Sprite
}>()

const emit = defineEmits<{
  added: [AssetData]
  cancelled: []
}>()

const { t } = useI18n()

const form = useForm({
  name: [props.asset.name, validateName],
  category: [categoryAll.value],
  isPublic: [false]
})

function handleCancel() {
  emit('cancelled')
}

const addAsset = useMessageHandle(
  apiAddAsset,
  { en: 'Failed to create asset', zh: '创建失败' },
  (asset) => ({ en: `Asset ${asset.displayName} added`, zh: `素材 ${asset.displayName} 添加成功` })
)

async function handleSubmit() {
  let params: PartialAssetData
  if (props.asset instanceof Backdrop) {
    params = await backdrop2Asset(props.asset)
  } else if (props.asset instanceof Sound) {
    params = await sound2Asset(props.asset)
  } else if (props.asset instanceof Sprite) {
    params = await sprite2Asset(props.asset)
  } else {
    throw new Error(`unknown asset type ${props.asset}`)
  }
  const assetData = await addAsset({
    ...params,
    displayName: form.value.name,
    isPublic: form.value.isPublic ? IsPublic.public : IsPublic.personal,
    category: form.value.category,
    preview: 'TODO'
  })
  emit('added', assetData)
}

function validateName(name: string) {
  name = name.trim()
  if (name === '') return t({ en: 'The asset name must not be blank', zh: '名称不可为空' })
}
</script>

<style scoped lang="scss"></style>
