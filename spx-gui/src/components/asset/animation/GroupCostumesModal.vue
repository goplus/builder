<template>
  <UIFormModal
    :radar="{ name: 'Group costumes modal', desc: 'Modal for grouping costumes as animation' }"
    style="width: 1034px"
    :visible="visible"
    :title="
      $t({
        en: 'Group costumes as animation',
        zh: '将造型合并为动画'
      })
    "
    :body-style="{ padding: '0' }"
    @update:visible="emit('cancelled')"
  >
    <div class="min-h-119 max-h-150 flex">
      <ul class="flex-[1_1_0] flex flex-wrap content-start gap-2 overflow-y-auto pt-5 pr-0 pb-5 pl-6">
        <CostumeItem
          v-for="costume in props.sprite.costumes"
          :key="costume.id"
          :costume="costume"
          :checked="selectedCostumeSet.has(costume)"
          @click="handleCostumeClick(costume)"
        />
      </ul>
      <div class="my-5 w-px self-stretch bg-dividing-line-2"></div>
      <div class="w-[402px] flex-none self-stretch px-6 py-5">
        <UIEmpty v-if="selectedCostumes.length === 0" size="medium">
          {{ $t({ en: 'Select costumes to continue', zh: '请选择造型' }) }}
        </UIEmpty>
        <AnimationPlayer v-else class="h-full w-full" :costumes="selectedCostumes" :duration="duration" :sound="null" />
      </div>
    </div>
    <div class="flex items-center gap-2 px-6 py-5">
      <div class="flex-1" />
      <UICheckbox v-model:checked="removeCostumes">
        <span>
          {{
            $t({
              en: 'Remove chosen costumes from the sprite’s costume list',
              zh: '从角色的造型列表删除所选造型'
            })
          }}
        </span>
      </UICheckbox>
      <UIButton
        v-radar="{ name: 'Add animation button', desc: 'Click to create animation from selected costumes' }"
        size="large"
        :disabled="selectedCostumeSet.size === 0"
        @click="handleConfirm"
      >
        {{ $t({ en: 'Add animation', zh: '添加动画' }) }}
      </UIButton>
    </div>
  </UIFormModal>
</template>
<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { UIButton, UICheckbox, UIEmpty, UIFormModal } from '@/components/ui'
import type { Costume } from '@/models/spx/costume'
import type { Sprite } from '@/models/spx/sprite'
import { defaultFps } from '@/models/spx/animation'
import AnimationPlayer from '@/components/editor/sprite/animation/AnimationPlayer.vue'
import CostumeItem from '@/components/editor/sprite/CheckableCostumeItem.vue'

const props = defineProps<{
  visible: boolean
  sprite: Sprite
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [
    {
      selectedCostumes: Costume[]
      removeCostumes: boolean
    }
  ]
}>()

const removeCostumes = ref(true)

const selectedCostumeSet = reactive<Set<Costume>>(new Set())
const selectedCostumes = computed(() => {
  const costumes = []
  // By this way we can keep the order of the costumes
  for (const costume of props.sprite.costumes) {
    if (selectedCostumeSet.has(costume)) {
      costumes.push(costume)
    }
  }
  return costumes
})
const duration = computed(() => selectedCostumes.value.length / defaultFps)

const handleCostumeClick = (costume: Costume) => {
  if (selectedCostumeSet.has(costume)) {
    selectedCostumeSet.delete(costume)
  } else {
    selectedCostumeSet.add(costume)
  }
}

const handleConfirm = () => {
  emit('resolved', {
    selectedCostumes: selectedCostumes.value,
    removeCostumes: removeCostumes.value
  })
}
</script>
