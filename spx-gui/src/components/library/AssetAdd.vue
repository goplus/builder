<template>
  <NForm v-bind="form.binds" :model="form.value">
    <NFormItem :label="$t({ en: 'Asset Name', zh: '素材名' })" path="name">
      <NInput v-model:value="form.value.name" />
    </NFormItem>
    <NFormItem :label="$t({ en: 'Category', zh: '素材类别' })" path="category">
      <NRadioGroup v-model:value="form.value.category">
        <NSpace>
          <NRadio v-for="c in categories" :key="c.value" :value="c.value" :label="$t(c.message)" />
        </NSpace>
      </NRadioGroup>
    </NFormItem>
    <NFormItem
      :label="$t({ en: 'Publish to public assets', zh: '发布到公共素材库' })"
      path="isPublic"
    >
      <NCheckbox v-model:checked="form.value.isPublic" />
    </NFormItem>
    <NFormItem>
      <NButton type="tertiary" @click="handleCancel">
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </NButton>
      <NButton type="primary" @click="handleSubmit">
        {{ $t({ en: 'Create', zh: '创建' }) }}
      </NButton>
    </NFormItem>
  </NForm>
</template>

<script setup lang="ts">
import { NForm, NFormItem, NInput, NButton, NRadioGroup, NRadio, NSpace, NCheckbox } from 'naive-ui'
import { type AssetData, addAsset as apiAddAsset, IsPublic } from '@/apis/asset'
import { useForm, type ValidationResult } from '@/utils/form'
import { useMessageHandle } from '@/utils/exception'
import { Backdrop } from '@/models/backdrop'
import { Sound } from '@/models/sound'
import { Sprite } from '@/models/sprite'
import type { PartialAssetData } from '@/models/common/asset'
import { categories, categoryAll } from './category'
import { backdrop2Asset, sound2Asset, sprite2Asset } from '@/models/common/asset'

const props = defineProps<{
  asset: Backdrop | Sound | Sprite
}>()

const emit = defineEmits<{
  added: [AssetData]
  cancelled: []
}>()

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
  const errs = await form.validate()
  if (errs.length > 0) return
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

function validateName(name: string): ValidationResult {
  name = name.trim()
  if (name === '') return { en: 'The asset name must not be blank', zh: '名称不可为空' }
}
</script>

<style scoped lang="scss"></style>
