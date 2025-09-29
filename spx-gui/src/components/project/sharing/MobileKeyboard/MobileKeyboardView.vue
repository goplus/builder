<script setup lang="ts">
import type { MobileKeyboardZoneToKeyMapping } from '@/apis/project'
import { UIButton } from '@/components/ui'
import UIKeyBtn from './UIKeyBtn.vue'
import type { Type as IconType } from '@/components/ui/icons/UIIcon.vue'
import { reactive, onMounted } from 'vue'
import type { KeyboardEventType, KeyCode } from './mobile-keyboard'
defineOptions({ name: 'MobileKeyboardView' })
const props = defineProps<{
  zoneToKeyMapping: MobileKeyboardZoneToKeyMapping
}>()
const emit = defineEmits<{
  close: []
  rerun: []
  key: [type: KeyboardEventType, key: KeyCode]
}>()

type SystemKeyType = {
  textEn?: string
  textZh?: string
  icon?: IconType
  action: string
}
const systemKeys: SystemKeyType[] = [
  {
    textEn: 'Rerun',
    textZh: '重新运行',
    icon: 'rotate' as IconType,
    action: 'rerun'
  },
  {
    textEn: 'Close',
    textZh: '关闭',
    icon: 'close' as IconType,
    action: 'close'
  }
]
const zoneToKey = reactive<MobileKeyboardZoneToKeyMapping>({
  lt: [],
  rt: [],
  lb: [],
  rb: []
})

onMounted(() => {

  const testMapping: MobileKeyboardZoneToKeyMapping = {
    lt: [
      { label: '跳跃', posx: 30, posy: 50 },
    ],
    rt: [
      { label: '攻击', posx: 50, posy: 50 },
    ],
    lb: [
      { label: '技能', posx: 60, posy: 50 },
    ],
    rb: [
      { label: '冲刺', posx: 60, posy: 80 },
    ]
  }

  Object.assign(zoneToKey, testMapping)
  console.log('使用测试键盘数据:', zoneToKey)
})
function dispatchKeyEvent(type: KeyboardEventType, key: KeyCode) {
  emit('key', type, key)
}

function getKeyStyle(zone: 'lt' | 'rt' | 'lb' | 'rb', posx: number, posy: number) {
  // 根据不同角落计算CSS定位，与 Editor 保持一致
  switch (zone) {
    case 'lt': // 左上角
      return { position: 'absolute', left: posx + 'px', top: posy + 'px' }
    case 'rt': // 右上角
      return { position: 'absolute', right: posx + 'px', top: posy + 'px' }
    case 'lb': // 左下角
      return { position: 'absolute', left: posx + 'px', bottom: posy + 'px' }
    case 'rb': // 右下角
      return { position: 'absolute', right: posx + 'px', bottom: posy + 'px' }
    default:
      return { position: 'absolute', left: posx + 'px', top: posy + 'px' }
  }
}
</script>

<template>
  <div class="phone-1YZxt">
    <slot name="gameView" class="game-view"></slot>
    <div class="stage-vTZqo">
      <div class="sys sysA">
        <UIButton class="button" :icon="systemKeys?.[0]?.icon" @click="emit('rerun')">
          {{ $t({ en: systemKeys?.[0]?.textEn ?? '', zh: systemKeys?.[0]?.textZh ?? '' }) }}
        </UIButton>
      </div>
      <div class="sys sysB">
        <UIButton class="button" :icon="systemKeys?.[1]?.icon" @click="emit('close')">
          {{ $t({ en: systemKeys?.[1]?.textEn ?? '', zh: systemKeys?.[1]?.textZh ?? '' }) }}
        </UIButton>
      </div>

      <!-- 左上角 -->
      <div class="zone lt">
        <UIKeyBtn v-for="btn in (zoneToKey.lt || [])" :key="btn.label" :value="btn.label" :active="true"
          :style="getKeyStyle('lt', btn.posx, btn.posy)" @key="dispatchKeyEvent" />
      </div>

      <!-- 右上角 -->
      <div class="zone rt">
        <UIKeyBtn v-for="btn in (zoneToKey.rt || [])" :key="btn.label" :value="btn.label" :active="true"
          :style="getKeyStyle('rt', btn.posx, btn.posy)" @key="dispatchKeyEvent" />
      </div>

      <!-- 左下角 -->
      <div class="zone lb">
        <UIKeyBtn v-for="btn in (zoneToKey.lb || [])" :key="btn.label" :value="btn.label" :active="true"
          :style="getKeyStyle('lb', btn.posx, btn.posy)" @key="dispatchKeyEvent" />
      </div>

      <!-- 右下角 -->
      <div class="zone rb">
        <UIKeyBtn v-for="btn in (zoneToKey.rb || [])" :key="btn.label" :value="btn.label" :active="true"
          :style="getKeyStyle('rb', btn.posx, btn.posy)" @key="dispatchKeyEvent" />
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.phone-1YZxt {
  position: relative;
  display: inline-block;
  width: 100%;
  height: 100%;
}

.game-view {
  display: block;
  max-width: 100%;
  height: auto;
}

.stage-vTZqo {
  // background-color: #413e3e;
  position: absolute;
  inset: 0;
  z-index: 2;

  .sys {
    position: absolute;
    top: 2%;
  }

  .sysA {
    left: 2%;
  }

  .sysB {
    right: 10%;
  }

  .zone {
    position: absolute;
    width: 30%;
    height: 42%;
    /* 移除 display: grid，让按键自由定位 */
  }

  .lt {
    left: 20px;
    top: 20px;
  }

  .rt {
    right: 20px;
    top: 20px;
  }

  .lb {
    left: 20px;
    bottom: 20px;
  }

  .rb {
    right: 20px;
    bottom: 20px;
  }
}
</style>
