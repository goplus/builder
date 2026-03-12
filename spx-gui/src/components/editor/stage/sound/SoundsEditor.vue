<template>
  <UIEmpty v-if="sounds.length === 0" size="extra-large">
    {{ $t({ en: 'No sounds', zh: '没有声音' }) }}
    <template #op>
      <UIDropdown trigger="click">
        <template #trigger>
          <UIButton v-radar="{ name: 'Add sound button', desc: 'Click to add a sound' }" color="boring" size="large">
            <template #icon>
              <UIIcon type="plus" />
            </template>
            {{ $t({ en: 'Add sound', zh: '添加声音' }) }}
          </UIButton>
        </template>
        <AddSoundMenu :state="state" />
      </UIDropdown>
    </template>
  </UIEmpty>
  <EditorList
    v-else
    v-radar="{ name: 'Sounds management', desc: 'Managing sounds' }"
    color="stage"
    resource-type="sound"
    :sortable="{ list: sounds }"
    @sorted="handleSorted"
  >
    <SoundItem
      v-for="sound in sounds"
      :key="sound.id"
      :sound="sound"
      :selectable="{ selected: sound.id === state.selected?.id }"
      operable
      @click="state.select(sound.id)"
    />
    <template #add-options>
      <AddSoundMenu :state="state" />
    </template>
    <template #detail>
      <SoundDetail v-if="state.selected != null" :sound="state.selected" />
    </template>
  </EditorList>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { UIEmpty, UIButton, UIDropdown, UIIcon } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { SoundsEditorState } from './sounds-editor-state'
import EditorList from '../../common/EditorList.vue'
import SoundItem from './SoundItem.vue'
import SoundDetail from './SoundDetail.vue'
import AddSoundMenu from './AddSoundMenu.vue'

defineProps<{
  state: SoundsEditorState
}>()

const editorCtx = useEditorCtx()
const sounds = computed(() => editorCtx.project.sounds)

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update sound order', zh: '更新声音顺序' } }
    await editorCtx.state.history.doAction(action, () => editorCtx.project.moveSound(oldIdx, newIdx))
  },
  {
    en: 'Failed to update sound order',
    zh: '更新声音顺序失败'
  }
).fn
</script>
