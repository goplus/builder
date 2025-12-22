<script lang="ts" setup>
import { computed, ref, shallowRef, watch } from 'vue'

import { UIButton, UIFormModal, UIPagination, UITextInput } from '@/components/ui'
import SpriteItem from './SpriteItem.vue'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import { useQuery } from '@/utils/query'
import { AssetType, listAsset, Visibility, type AssetData } from '@/apis/asset'
import { categoryAll, type Category } from './category'
import { useMessageHandle } from '@/utils/exception'
import type { Project } from '@/models/project'
import { asset2Sprite } from '@/models/common/asset'
import type { Sprite } from '@/models/sprite'
import { debounce } from 'lodash'
import SpriteSettingInput from './gen/sprite/SpriteSettingInput.vue'
import { SpriteGen } from '@/models/gen/sprite-gen'
import { useDefaultCostumeGenModal } from '..'

const props = defineProps<{
  visible: boolean
  project: Project
}>()

const emit = defineEmits<{
  resolved: [Sprite[]]
  cancelled: []
}>()

const keyword = ref<string>('')
const searchInput = ref('')
watch(
  searchInput,
  debounce(() => {
    keyword.value = searchInput.value
    spriteGen.value?.setInput(keyword.value)
  }, 500)
)
const spriteGen = shallowRef<SpriteGen>(new SpriteGen(props.project, keyword.value))

const category = ref(categoryAll)
const categoryPersonal = computed<Category>(() => ({
  value: 'personal',
  message: { en: `My Sprites`, zh: `我的精灵` }
}))
const page = shallowRef(1)
const pageSize = 18 // 6 * 3
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))
const queryRet = useQuery(
  () => {
    const c = category.value.value
    const cPersonal = categoryPersonal.value.value
    return listAsset({
      pageSize,
      pageIndex: page.value,
      type: AssetType.Sprite,
      keyword: keyword.value,
      orderBy: 'displayName',
      category: c === categoryAll.value || c === cPersonal ? undefined : c,
      owner: c === cPersonal ? undefined : '*',
      visibility: c === cPersonal ? undefined : Visibility.Public
    })
  },
  {
    en: 'Failed to list',
    zh: '获取列表失败'
  }
)

const selected = ref<AssetData[]>([])
function isSelected(asset: AssetData) {
  return selected.value.some((a) => a.id === asset.id)
}

async function handleAssetClick(asset: AssetData) {
  const index = selected.value.findIndex((a) => a.id === asset.id)
  if (index < 0) selected.value.push(asset)
  else selected.value.splice(index, 1)
}

async function addAssetToProject(asset: AssetData) {
  switch (asset.type) {
    case AssetType.Sprite: {
      const sprite = await asset2Sprite(asset)
      props.project.addSprite(sprite)
      await sprite.autoFit()
      return sprite
    }
    default:
      throw new Error('unknown asset type')
  }
}
const handleConfirm = useMessageHandle(
  async () => {
    const action = {
      name: { en: `Add sprite`, zh: `添加精灵` }
    }
    const assetModels = await props.project.history.doAction(action, () =>
      Promise.all(selected.value.map(addAssetToProject))
    )
    emit('resolved', assetModels)
  },
  { en: 'Failed to add sprite', zh: '精灵添加失败' }
)

const defaultCostumeGenModal = useDefaultCostumeGenModal()
function handleGenerate() {
  emit('cancelled')
  defaultCostumeGenModal(props.project, spriteGen.value)
}
</script>

<template>
  <UIFormModal
    :visible="visible"
    size="large"
    :title="$t({ zh: '选择精灵', en: 'Select Sprite' })"
    @update:visible="emit('cancelled')"
  >
    <div class="search-wrapper">
      <UITextInput v-model:value="searchInput" :placeholder="$t({ zh: '搜索', en: 'Search' })"></UITextInput>
    </div>

    <div class="asset-list-wrapper">
      <ListResultWrapper :query-ret="queryRet" :height="436">
        <template #empty>
          <div class="empty">
            <div>
              {{
                $t({
                  zh: `没有找到 ${keyword} 的结果, 可以尝试用 AI 生成吧`,
                  en: `No results for ${keyword}, try to generate with AI`
                })
              }}
            </div>

            <SpriteSettingInput :sprite-gen="spriteGen">
              <template #buttons>
                <UIButton @click="handleGenerate">{{ $t({ zh: '生成', en: 'Generate' }) }}</UIButton>
              </template>
            </SpriteSettingInput>
          </div>
        </template>
        <template #default="slotProps">
          <ul class="asset-list" style="height: 436px">
            <SpriteItem
              v-for="asset in slotProps.data.data"
              :key="asset.id"
              :asset="asset"
              :selected="isSelected(asset)"
              @click="handleAssetClick(asset)"
            />
          </ul>
        </template>
      </ListResultWrapper>
      <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
    </div>

    <div class="footer">
      <UIButton :disabled="selected.length === 0" @click="handleConfirm.fn">{{
        $t({ zh: '确认', en: 'Confirm' })
      }}</UIButton>
    </div>
  </UIFormModal>
</template>

<style lang="scss" scoped>
.search-wrapper {
  display: flex;
  margin-bottom: 26px;
}

.asset-list-wrapper {
  margin: 0 auto;
}

.asset-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-content: flex-start;
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin: 100px 250px 200px 250px;
  gap: 24px;
  height: 100%;
}

.pagination {
  justify-content: center;
  margin: 36px 0 12px;
}

.footer {
  display: flex;
  justify-content: flex-end;
}
</style>
