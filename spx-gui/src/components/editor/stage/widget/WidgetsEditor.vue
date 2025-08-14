<template>
  <UIEmpty v-if="stage.widgets.length === 0" size="extra-large">
    {{ $t({ en: 'No widgets', zh: '没有控件' }) }}
    <template #op>
      <UIButton
        v-radar="{ name: 'Add monitor button', desc: 'Click to add a monitor widget' }"
        type="boring"
        size="large"
        @click="handleAddMonitor"
      >
        <template #icon>
          <img :src="monitorIcon" />
        </template>
        {{ $t({ en: 'Add widget Monitor', zh: '添加监视器控件' }) }}
      </UIButton>
    </template>
  </UIEmpty>
  <EditorList
    v-else
    v-radar="{ name: 'Widgets management', desc: 'Managing widgets' }"
    color="stage"
    resource-type="widget"
    :sortable="{ list: stage.widgets }"
    @sorted="handleSorted"
  >
    <WidgetItem
      v-for="widget in stage.widgets"
      :key="widget.id"
      :widget="widget"
      :selectable="{ selected: state.selected?.id === widget.id }"
      removable
      operable
      @click="state.select(widget.id)"
    />
    <template #add-options>
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'Add monitor', desc: 'Click to add a monitor widget' }"
          @click="handleAddMonitor"
          >{{ $t({ en: 'Monitor', zh: '监视器' }) }}</UIMenuItem
        >
      </UIMenu>
    </template>
    <template #detail>
      <WidgetDetail v-if="state.selected != null" :widget="state.selected" />
    </template>
  </EditorList>
</template>

<script lang="ts">
export class WidgetsEditorState extends Disposable {
  constructor(private getStage: () => Stage) {
    super()
    this.selectedIdRef = ref(getStage().widgets[0]?.id ?? null)

    this.addDisposer(
      watch(
        () => this.selected,
        (selected) => {
          if (selected == null && this.getStage().widgets.length > 0) {
            this.select(this.getStage().widgets[0].id)
          }
        }
      )
    )
  }

  private selectedIdRef: Ref<string | null>

  /** The currently selected widget */
  get selected() {
    return this.getStage().widgets.find((widget) => widget.id === this.selectedIdRef.value) ?? null
  }
  /** Select a target (by ID) */
  select(id: string | null) {
    this.selectedIdRef.value = id
  }
  /** Select a target (by name) */
  selectByName(name: string): void {
    const widget = this.getStage().widgets.find((widget) => widget.name === name)
    if (widget == null) throw new Error(`Widget with name "${name}" not found`)
    this.select(widget.id)
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
import { UIMenu, UIMenuItem, UIEmpty, UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { Disposable } from '@/utils/disposable'
import { shiftPath, type PathSegments } from '@/utils/route'
import type { Stage } from '@/models/stage'
import { useAddMonitor } from '@/components/asset'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import EditorList from '../../common/EditorList.vue'
import WidgetItem from './WidgetItem.vue'
import WidgetDetail from './detail/WidgetDetail.vue'
import monitorIcon from './monitor-gray.svg'

const props = defineProps<{
  state: WidgetsEditorState
}>()

const editorCtx = useEditorCtx()
const stage = computed(() => editorCtx.project.stage)

const addMonitor = useAddMonitor()

const handleAddMonitor = useMessageHandle(
  async () => {
    const monitor = await addMonitor(editorCtx.project)
    props.state.select(monitor.id)
  },
  {
    en: 'Failed to add widget',
    zh: '添加控件失败'
  }
).fn

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update widget order', zh: '更新控件顺序' } }
    await editorCtx.project.history.doAction(action, () => stage.value.moveWidget(oldIdx, newIdx))
  },
  {
    en: 'Failed to update widget order',
    zh: '更新控件顺序失败'
  }
).fn
</script>
