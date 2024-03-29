import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useProjectStore } from '.'
import { watch } from 'vue'

type Selected =
  | {
      type: 'sprite' | 'sound'
      name: string
    }
  | {
      type: 'stage'
    }

export const useEditorStore = defineStore('editor', () => {
  const projectStore = useProjectStore()

  const selectedRef = ref<Selected | null>(null)

  function select(selected: null): void
  function select(type: 'stage'): void
  function select(type: 'sprite' | 'sound', name: string): void
  function select(type: any, name?: string) {
    selectedRef.value = type == null ? type : { type, name }
  }

  const selectedSpriteName = computed(() => {
    const selected = selectedRef.value
    return selected?.type === 'sprite' ? selected.name : null
  })

  const selectedSprite = computed(() => {
    if (!selectedSpriteName.value) return null
    return projectStore.project.sprites.find((s) => s.name === selectedSpriteName.value) || null
  })

  watch(
    () => projectStore.project,
    (project) => {
      if (project.sprites.length > 0) {
        select('sprite', project.sprites[0].name)
      } else {
        select(null)
      }
    }
  )

  return {
    selected: selectedRef,
    select,
    selectedSpriteName,
    selectedSprite
  }
})
