import Sprite from "@/class/sprite"
import createStore from "@/util/store"

/**
 * Sprite store.
 * @example
 * const spriteStore = useSpriteStore()
 * // Recommend to give an alias to the list and current.
 * const { list: sprites, current: currentSprite } = storeToRefs(spriteStore)
 */
export const useSpriteStore = createStore<Sprite>('sprite')