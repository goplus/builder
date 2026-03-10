<template>
  <EditorList
    v-radar="{ name: 'Sounds management', desc: 'Managing sounds of stage' }"
    color="stage"
    resource-type="sound"
    :sortable="{ list: sounds }"
    @sorted="handleSorted"
  >
    <UIEmpty v-if="sounds.length === 0" size="medium">
      {{ $t({ en: 'Click + to add sound', zh: '点击 + 号添加声音' }) }}
    </UIEmpty>
    <SoundItem
      v-for="sound in sounds"
      :key="sound.id"
      :sound="sound"
      :selectable="{ selected: sound.id === state.selected?.id }"
      operable
      @click="state.select(sound.id)"
    />
    <template #add-options>
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'Add from local file', desc: 'Click to add sound from local file' }"
          @click="handleAddFromLocalFile"
          >{{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}</UIMenuItem
        >
        <UIMenuItem
          v-radar="{ name: 'Add from asset library', desc: 'Click to add sound from asset library' }"
          @click="handleAddFromAssetLibrary"
          >{{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}</UIMenuItem
        >
        <UIMenuItem v-radar="{ name: 'Record sound', desc: 'Click to record a new sound' }" @click="handleRecord">{{
          $t({ en: 'Record', zh: '录音' })
        }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #detail>
      <SoundDetail v-if="state.selected != null" :sound="state.selected" />
    </template>
  </EditorList>
</template>
<script lang="ts">
export class SoundsEditorState extends Disposable {
  constructor(private getSounds: () => Sound[]) {
    super()
    this.selectedIdRef = ref(getSounds()[0]?.id ?? null)

    this.addDisposer(
      watch(
        () => [this.selected, this.getSounds()[0]?.id] as const,
        ([selected, firstSoundId]) => {
          if (selected == null && firstSoundId != null) {
            this.select(firstSoundId)
          }
        }
      )
    )
  }

  private selectedIdRef: Ref<string | null>

  /** The currently selected sound */
  get selected() {
    return this.getSounds().find((sound) => sound.id === this.selectedIdRef.value) ?? null
  }
  /** Select a target (by ID) */
  select(id: string | null) {
    this.selectedIdRef.value = id
  }
  /** Select a target (by name) */
  selectByName(name: string): void {
    const sound = this.getSounds().find((sound) => sound.name === name)
    if (sound == null) {
      capture(new Error(`Sound with name "${name}" not found`))
      return
    }
    this.select(sound.id)
  }
  /** Select a target (by specifying route path) */
  selectByRoute(path: PathSegments) {
    const [name] = shiftPath(path)
    if (name == null) return
    return this.selectByName(name)
  }
  /** Get route path for the current selection */
  getRoute(): PathSegments {
    if (this.selected == null) return []
    return [this.selected.name]
  }
}
</script>
<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue'
import { UIMenu, UIMenuItem, UIEmpty } from '@/components/ui'
import { AssetType } from '@/apis/asset'
import type { Sound } from '@/models/spx/sound'
import { Disposable } from '@/utils/disposable'
import { capture, useMessageHandle } from '@/utils/exception'
import { shiftPath, type PathSegments } from '@/utils/route'
import { useAddAssetFromLibrary, useAddSoundFromLocalFile, useAddSoundByRecording } from '@/components/asset'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import EditorList from '../../common/EditorList.vue'
import SoundItem from './SoundItem.vue'
import SoundDetail from './SoundDetail.vue'

const props = defineProps<{
  state: SoundsEditorState
}>()

const editorCtx = useEditorCtx()
const sounds = computed(() => editorCtx.project.sounds)

const addFromLocalFile = useAddSoundFromLocalFile()
const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const sound = await addFromLocalFile(editorCtx.project)
    props.state.select(sound.id)
  },
  {
    en: 'Failed to add sound from local file',
    zh: '从本地文件添加失败'
  }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary()
const handleAddFromAssetLibrary = useMessageHandle(
  async () => {
    const nextSounds = await addAssetFromLibrary(editorCtx.project, AssetType.Sound)
    props.state.select(nextSounds[0].id)
  },
  {
    en: 'Failed to add sound from asset library',
    zh: '从素材库添加失败'
  }
).fn

const addSoundFromRecording = useAddSoundByRecording()
const handleRecord = useMessageHandle(
  async () => {
    const sound = await addSoundFromRecording(editorCtx.project)
    props.state.select(sound.id)
  },
  {
    en: 'Failed to record sound',
    zh: '录音失败'
  }
).fn

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
