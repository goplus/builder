/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-24 08:48:56
 * @FilePath: \builder\spx-gui\src\store\modules\sprite\index.ts
 * @Description: The store of sprite.
 */

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