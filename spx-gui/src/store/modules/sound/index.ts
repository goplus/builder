/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-24 08:48:41
 * @FilePath: \builder\spx-gui\src\store\modules\sound\index.ts
 * @Description: The store of sound.
 */
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