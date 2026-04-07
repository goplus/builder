<script lang="ts">
export function getDefaultValue() {
  return null
}
</script>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { UIDropdown, UIMenu, UIMenuItem, UIBlockItem, UIIcon } from '@/components/ui'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import type {
  ResourceURI,
  ResourceIdentifier,
  InputSlotAccept,
  BuiltInInputType,
  InputSlotAcceptForType
} from '../../common'

const props = defineProps<{
  accept: InputSlotAccept
  value: ResourceURI | null
}>()

const emit = defineEmits<{
  'update:value': [ResourceURI | null]
  submit: []
}>()

const { ui } = useCodeEditorUICtx()
const provider = ui.resourceProvider
const accept = props.accept as InputSlotAcceptForType<BuiltInInputType.ResourceName>
const selector = provider?.useResourceSelector(accept.resourceContext) ?? null

const selected = ref(props.value)
function select(item: ResourceIdentifier) {
  selected.value = item.uri
  emit('update:value', item.uri)
}

const handleCreateWith = useMessageHandle(
  async (handler: () => Promise<ResourceIdentifier | null>) => {
    const created = await handler()
    if (created != null) select(created)
  },
  { en: 'Failed to create', zh: '创建失败' }
).fn

onMounted(() => {
  if (selected.value == null && selector != null && selector.items.length > 0) {
    select(selector.items[0])
  }
})
</script>

<template>
  <ul
    v-if="provider != null && selector != null"
    class="flex w-94 max-h-70 flex-none flex-wrap content-start gap-2 overflow-y-auto"
  >
    <component
      :is="provider.provideResourceItemRenderer()"
      v-for="item in selector.items"
      :key="item.uri"
      :resource="item"
      :selectable="{ selected: item.uri === selected }"
      @click="select(item)"
    />
    <UIDropdown trigger="click" placement="top">
      <template #trigger>
        <UIBlockItem class="justify-center text-primary-main">
          <UIIcon class="w-6 h-6" type="plus" />
        </UIBlockItem>
      </template>
      <UIMenu>
        <UIMenuItem v-for="(method, i) in selector.createMethods" :key="i" @click="handleCreateWith(method.handler)">
          {{ $t(method.label) }}
        </UIMenuItem>
      </UIMenu>
    </UIDropdown>
  </ul>
</template>
