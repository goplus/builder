import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useProjectStore } from '.'
import { watch } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  const projectStore = useProjectStore()

  const currentSpriteName = ref<string | null>(null)
  const currentSprite = computed(() => {
    if (!currentSpriteName.value) return null
    return projectStore.project.sprite.list.find((s) => s.name === currentSpriteName.value) || null
  })

  watch(
    () => projectStore.project,
    () => {
      currentSpriteName.value = projectStore.project.sprite.list[0]?.name || null
    }
  )

  return {
    currentSpriteName,
    currentSprite
  }
})
