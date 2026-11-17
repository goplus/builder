<script setup lang="ts">
import { computed } from 'vue'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import type { Backdrop } from '@/models/spx/backdrop'
import type { BackdropEdit } from '@/models/spx/edit/backdrop-edit'
import { UIImg } from '@/components/ui'
import GenLoading from '@/components/asset/gen/common/GenLoading.vue'
import GenStateFailed from '@/components/asset/gen/common/GenStateFailed.vue'
import EditorItemDetail from '../../common/EditorItemDetail.vue'
import ResourceCanvas from '../../sprite/ResourceCanvas.vue'

const props = defineProps<{ backdrop: Backdrop; edit: BackdropEdit }>()
defineEmits<{ rename: [] }>()
const [src, loading] = useRenderableImageUrl(() => props.edit.image)
const generating = computed(() => props.edit.generateState.status === 'running')
</script>

<template>
  <EditorItemDetail :name="backdrop.name" @rename="$emit('rename')">
    <ResourceCanvas :resource-key="backdrop.id" :image="edit.image">
      <UIImg :src="src" :loading="loading" class="h-full w-full rounded-md" />
      <template #overlay="{ area }">
        <slot v-if="!loading && !generating" name="overlay" :area="area"></slot>
      </template>
      <template #media-overlay>
        <GenLoading :visible="generating" cover>{{
          $t({ en: 'Generating changes...', zh: '正在生成修改...' })
        }}</GenLoading>
        <GenStateFailed v-if="edit.generateState.status === 'failed'" :state-failed="edit.generateState" cover />
      </template>
    </ResourceCanvas>
  </EditorItemDetail>
</template>
