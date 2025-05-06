<script lang="ts">
export function getDefaultValue() {
  return 'spx://resources/sprites/unknown'
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { UIDropdown, UIMenu, UIMenuItem, UIBlockItem, UIIcon } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { getResourceURI, type ResourceContextURI, type ResourceURI } from '../../common'
import { createResourceSelector, type CreateMethod, type SelectableResource } from '../resource-reference/selector'
import ResourceItem from '../resource/ResourceItem.vue'

const props = defineProps<{
  context: ResourceContextURI // TODO: provide resource list based on context
  value: ResourceURI
}>()

const emit = defineEmits<{
  'update:value': [ResourceURI]
}>()

const editorCtx = useEditorCtx()

const selector = createResourceSelector(editorCtx.project, {
  uri: props.value
})

const createMethods = selector.useCreateMethods()

const selected = ref(selector.currentItemName)
function select(item: SelectableResource) {
  selected.value = item.name
  emit('update:value', getResourceURI(item))
}

const handleCreateWith = useMessageHandle(
  async (method: CreateMethod<SelectableResource>) => {
    const created = await method.handler()
    const firstCreated = Array.isArray(created) ? created[0] : created
    select(firstCreated)
  },
  { en: 'Failed to create', zh: '创建失败' }
).fn
</script>

<template>
  <ul class="items">
    <ResourceItem
      v-for="item in selector.items"
      :key="item.name"
      :resource="item"
      :selectable="{ selected: item.name === selected }"
      @click="select(item)"
    />
    <UIDropdown trigger="click" placement="top">
      <template #trigger>
        <UIBlockItem class="add">
          <UIIcon class="icon" type="plus" />
        </UIBlockItem>
      </template>
      <UIMenu>
        <UIMenuItem v-for="(method, i) in createMethods" :key="i" @click="handleCreateWith(method)">
          {{ $t(method.label) }}
        </UIMenuItem>
      </UIMenu>
    </UIDropdown>
  </ul>
</template>

<style lang="scss" scoped>
.items {
  flex: 1 1 0;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
}

.add {
  justify-content: center;
  color: var(--ui-color-primary-main);
  .icon {
    width: 24px;
    height: 24px;
  }
}
</style>
