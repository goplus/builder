<script lang="ts">
import { debounce } from 'lodash'

import { type Project } from '@/models/project'
import { type Sprite } from '@/models/sprite'

export function wrapUpdateHandler<Args extends any[]>(
  handler: (...args: Args) => unknown,
  provideSpriteContext: () => { sprite: Sprite; project: Project },
  withDebounce = true
): (...args: Args) => void {
  const { sprite, project } = provideSpriteContext()
  const sname = sprite.name
  const action = { name: { en: `Configure sprite ${sname}`, zh: `修改精灵 ${sname} 配置` } }
  const wrapped = (...args: Args) => project.history.doAction(action, () => handler(...args))
  return withDebounce ? debounce(wrapped, 300) : wrapped
}

// TODO: fix `"default" is not exported by xxx` error
export default {}
</script>

<template>
  <div class="item">
    <slot></slot>
  </div>
</template>

<style lang="scss">
.item {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
