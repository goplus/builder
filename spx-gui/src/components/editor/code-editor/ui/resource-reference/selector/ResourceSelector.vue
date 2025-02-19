<script setup lang="ts" generic="T extends SelectableResource">
import { ref } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { UIDropdownModal, UIDropdown, UIBlockItem, UIIcon, UIMenu, UIMenuItem } from '@/components/ui'
import ResourceItem from '../../resource/ResourceItem.vue'
import { type IResourceSelector, type SelectableResource, type CreateMethod } from '.'

const props = defineProps<{
  selector: IResourceSelector<T>
}>()

const emit = defineEmits<{
  cancel: []
  selected: [newResourceName: string]
}>()

const createMethods = props.selector.useCreateMethods()

const selected = ref(props.selector.currentItemName)
function handleSelect(name: string) {
  selected.value = name
}

const handleCreateWith = useMessageHandle(
  async (method: CreateMethod<T>) => {
    const created = await method.handler()
    const firstCreated = Array.isArray(created) ? created[0] : created
    selected.value = firstCreated.name
  },
  { en: 'Failed to create', zh: '创建失败' }
).fn

function handleConfirm() {
  emit('selected', selected.value)
}

function handleWheel(e: WheelEvent) {
  // Prevent monaco editor from handling wheel event in completion card, see details in https://github.com/microsoft/monaco-editor/issues/2304
  e.stopPropagation()
}
</script>

<template>
  <UIDropdownModal
    class="resource-selector"
    :title="$t(props.selector.title)"
    style="width: 408px; max-height: 316px"
    @cancel="emit('cancel')"
    @confirm="handleConfirm"
    @wheel="handleWheel"
  >
    <ul class="items">
      <ResourceItem
        v-for="item in selector.items"
        :key="item.name"
        :resource="item"
        :selectable="{ selected: item.name === selected }"
        @click="handleSelect(item.name)"
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
  </UIDropdownModal>
</template>

<style lang="scss" scoped>
.resource-selector {
  overflow: hidden;
}

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
