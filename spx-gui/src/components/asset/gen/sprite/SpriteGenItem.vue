<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle, UIIcon, UIImg, UILoading, UITooltip } from '@/components/ui'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import { useFileUrl } from '@/utils/file'
import { computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  gen: SpriteGen
}>()

const [url, loading] = useFileUrl(() => props.gen.image)
const isLoading = computed(() => props.gen.contentPreparingState.status !== 'finished' || loading.value)
</script>

<template>
  <UITooltip>
    <template #trigger>
      <UIBlockItem v-bind="$attrs">
        <div class="content">
          <UIImg v-if="url != null" class="preview" :src="url" :loading="loading" />
          <!-- TODO: Replace UILoading with custom sprite generation animation component -->
          <UILoading v-if="isLoading" class="loading" />
          <div v-else class="generated">
            <UIIcon class="icon" type="check" />
          </div>
        </div>
        <UIBlockItemTitle size="medium">{{ gen.settings.name }}</UIBlockItemTitle>
      </UIBlockItem>
    </template>
    {{
      isLoading
        ? $t({ zh: '素材生成中，点击查看', en: 'Sprite is being generated, click to view' })
        : $t({ zh: '素材生成完成，点击查看', en: 'Sprite is generated, click to view' })
    }}
  </UITooltip>
</template>

<style lang="scss" scoped>
.content {
  width: 60px;
  height: 60px;
  margin-bottom: 5px;
  position: relative;
}

.preview,
.loading,
.generated {
  width: 100%;
  height: 100%;
}

.preview {
  position: absolute;
  opacity: 0.3;
}

.loading {
  position: relative;
}

.generated {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  .icon {
    width: 32px;
    height: 32px;
    padding: 8px;
    color: var(--ui-color-grey-100);
    border-radius: 50%;
    background: var(--ui-color-primary-main);
  }
}
</style>
