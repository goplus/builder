import { defineStore, storeToRefs } from 'pinia'
import { Sprite } from '@/class/sprite'
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useProjectStore } from '../index'
export const useSpriteStore = defineStore("sprite", () => {
    const projectStore = useProjectStore();
    const { project } = storeToRefs(projectStore);

    const current: Ref<Sprite | null> = ref(null)

    const list: ComputedRef<Sprite[]> = computed(() => {
        return project.value.sprite.list as Sprite[]
    })

    const map = computed(() => new Map(list.value.map(item => [item.name, item])))

    function addItem(item: Sprite){
        project.value.sprite.add(item)
    }

    function setCurrentByName(name: string) {
        if (map.value.has(name)) {
            current.value = map.value.get(name) || null
        }
    }

    function removeItemByName(name: string) {
        const sprite = map.value.get(name)
        if (sprite) {
            if (current.value === sprite) {
                current.value = list.value[0] || null
            }
            project.value.sprite.remove(sprite)
        }
    }

    return {
        list, current,
        addItem,
        setCurrentByName,
        removeItemByName
    }
})