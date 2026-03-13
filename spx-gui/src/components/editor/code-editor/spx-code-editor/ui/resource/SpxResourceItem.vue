<script setup lang="ts">
import { computed } from 'vue'
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
import { getResourceModel } from '../../common'

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
</script>

<template>
  <AnimationItem
    v-if="model instanceof Animation"
    :animation="model"
    :selectable="selectable"
    color="primary"
    :autoplay="autoplay"
  />
  <BackdropItem v-else-if="model instanceof Backdrop" :backdrop="model" :selectable="selectable" color="primary" />
  <CostumeItem v-else-if="model instanceof Costume" :costume="model" :selectable="selectable" color="primary" />
  <SoundItem v-else-if="model instanceof Sound" :sound="model" :selectable="selectable" color="primary" />
  <SpriteItem
    v-else-if="model instanceof Sprite"
    :sprite="model"
    :selectable="selectable"
    color="primary"
    :autoplay="autoplay"
  />
  <WidgetItem v-else-if="model != null && isWidget(model)" :widget="model" :selectable="selectable" color="primary" />
</template>

<style lang="scss" scoped></style>
