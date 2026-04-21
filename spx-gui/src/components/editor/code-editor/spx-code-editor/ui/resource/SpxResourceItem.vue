<script setup lang="ts">
import { computed } from 'vue'
import { capture } from '@/utils/exception'
import { Animation } from '@/models/spx/animation'
import { Backdrop } from '@/models/spx/backdrop'
import { Costume } from '@/models/spx/costume'
import { Sound } from '@/models/spx/sound'
import { Sprite } from '@/models/spx/sprite'
import { isWidget } from '@/models/spx/widget'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import AnimationItem from '@/components/editor/sprite/AnimationItem.vue'
import CostumeItem from '@/components/editor/sprite/CostumeItem.vue'
import SoundItem from '@/components/editor/stage/sound/SoundItem.vue'
import SpriteItem from '@/components/editor/sprite/SpriteItem.vue'
import BackdropItem from '@/components/editor/stage/backdrop/BackdropItem.vue'
import WidgetItem from '@/components/editor/stage/widget/WidgetItem.vue'
import type { ResourceIdentifier } from '../../../xgo-code-editor'
import { getResourceModel, getResourceNameWithType } from '../../common'

const props = withDefaults(
  defineProps<{
    resource: ResourceIdentifier
    selectable?: false | { selected: boolean }
    autoplay?: boolean
  }>(),
  {
    selectable: false,
    autoplay: false
  }
)

const editorCtx = useEditorCtx()
const model = computed(() => getResourceModel(editorCtx.project, props.resource))
const name = computed(() => {
  try {
    return getResourceNameWithType(props.resource.uri).name
  } catch (err) {
    capture(err, `Failed to resolve resource URI: ${props.resource.uri}`)
    return props.resource.uri
  }
})
</script>

<template>
  <AnimationItem v-if="model instanceof Animation" :animation="model" :selectable="selectable" :autoplay="autoplay" />
  <BackdropItem v-else-if="model instanceof Backdrop" :backdrop="model" :selectable="selectable" />
  <CostumeItem v-else-if="model instanceof Costume" :costume="model" :selectable="selectable" />
  <SoundItem v-else-if="model instanceof Sound" :sound="model" :selectable="selectable" />
  <SpriteItem v-else-if="model instanceof Sprite" :sprite="model" :selectable="selectable" :autoplay="autoplay" />
  <WidgetItem v-else-if="model != null && isWidget(model)" :widget="model" :selectable="selectable" />
  <div v-else>{{ $t({ zh: `未知资源（${name}）`, en: `Unknown resource (${name})` }) }}</div>
</template>
