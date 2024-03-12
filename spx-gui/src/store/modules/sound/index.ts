import { defineStore, storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useProjectStore } from '../index'
import { Sound } from '@/class/sound'

export const useSoundStore = defineStore("sound", () => {
  const projectStore = useProjectStore();
  const { project } = storeToRefs(projectStore);

  const current: Ref<Sound | null> = ref(null)

  const list: ComputedRef<Sound[]> = computed(() => {
    return project.value.sound.list as Sound[]
  })

  const map = computed(() => new Map(list.value.map(item => [item.name, item])))

  function addItem(item: Sound){
    project.value.sound.add(item)
  }

  function setCurrentByName(name: string) {
    if (map.value.has(name)) {
      current.value = map.value.get(name) || null
    }
  }

  function removeItemByName(name: string) {
    const sound = map.value.get(name)
    if (sound) {
      if (current.value === sound) {
        current.value = list.value[0] || null
      }
      project.value.sound.remove(sound)
    }
  }

  function existsByName(name: string): boolean {
    return map.value.has(name);
  }

  return {
    list,
    current,
    addItem,
    setCurrentByName,
    removeItemByName,
    existsByName
  }
})
