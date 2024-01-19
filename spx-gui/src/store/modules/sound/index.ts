import Sound from '@/class/sound'
import createStore from '@/util/store'

/**
 * Sound store.
 * @example
 * const soundStore = useSoundStore()
 * // Recommend to give an alias to the list and current.
 * const { list: sounds, current: currentSound } = storeToRefs(soundStore)
 */
export const useSoundStore = createStore<Sound>('sound')