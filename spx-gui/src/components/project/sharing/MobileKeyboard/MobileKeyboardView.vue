<script setup lang="ts">
import type { MobileKeyboardZoneToKeyMapping } from '@/apis/project'
import { UIButton } from '@/components/ui'
import UIKeyBtn from './UIKeyBtn.vue'
import type { Type as IconType } from '@/components/ui/icons/UIIcon.vue'
import { reactive, onMounted } from 'vue'
import { KeyboardEventType, KeyCode } from './mobile-keyboard'
defineOptions({ name: 'MobileKeyboardView' })
const props = defineProps<{
  zoneToKeyMapping: MobileKeyboardZoneToKeyMapping
}>()
const emit = defineEmits<{
  close: []
  rerun: []
  onKeyEvent: [type: KeyboardEventType, key: KeyCode]
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
  lt: null,
  rt: null,
  lbUp: null,
  lbLeft: null,
  lbRight: null,
  lbDown: null,
  rbA: null,
  rbB: null,
  rbX: null,
  rbY: null
})
onMounted(() => {
  Object.assign(zoneToKey, props.zoneToKeyMapping)
})
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

      <!-- 左上角-->
      <div class="zone lt">
        <UIKeyBtn
          v-if="zoneToKey.lt"
          :value="zoneToKey.lt!"
          :active="true"
          :on-key-event="(type, key) => emit('onKeyEvent', type, key)"
        />
      </div>
      <!-- 右上角 -->
      <div class="zone rt">
        <UIKeyBtn
          v-if="zoneToKey.rt"
          :value="zoneToKey.rt!"
          :active="true"
          :on-key-event="(type, key) => emit('onKeyEvent', type, key)"
        />
      </div>

      <!-- 左下角 4 -->
      <div class="zone lb-up">
        <UIKeyBtn
          v-if="zoneToKey.lbUp"
          :value="zoneToKey.lbUp!"
          :active="true"
          :on-key-event="(type, key) => emit('onKeyEvent', type, key)"
        />
      </div>
      <div class="zone lb-left">
        <UIKeyBtn
          v-if="zoneToKey.lbLeft"
          :value="zoneToKey.lbLeft!"
          :active="true"
          :on-key-event="(type, key) => emit('onKeyEvent', type, key)"
        />
      </div>
      <div class="zone lb-right">
        <UIKeyBtn
          v-if="zoneToKey.lbRight"
          :value="zoneToKey.lbRight!"
          :active="true"
          :on-key-event="(type, key) => emit('onKeyEvent', type, key)"
        />
      </div>
      <div class="zone lb-down">
        <UIKeyBtn
          v-if="zoneToKey.lbDown"
          :value="zoneToKey.lbDown!"
          :active="true"
          :on-key-event="(type, key) => emit('onKeyEvent', type, key)"
        />
      </div>

      <!-- 右下角 4 -->
      <div class="zone rb-a">
        <UIKeyBtn
          v-if="zoneToKey.rbA"
          :value="zoneToKey.rbA!"
          :active="true"
          :on-key-event="(type, key) => emit('onKeyEvent', type, key)"
        />
      </div>
      <div class="zone rb-b">
        <UIKeyBtn
          v-if="zoneToKey.rbB"
          :value="zoneToKey.rbB!"
          :active="true"
          :on-key-event="(type, key) => emit('onKeyEvent', type, key)"
        />
      </div>
      <div class="zone rb-x">
        <UIKeyBtn
          v-if="zoneToKey.rbX"
          :value="zoneToKey.rbX!"
          :active="true"
          :on-key-event="(type, key) => emit('onKeyEvent', type, key)"
        />
      </div>
      <div class="zone rb-y">
        <UIKeyBtn
          v-if="zoneToKey.rbY"
          :value="zoneToKey.rbY!"
          :active="true"
          :on-key-event="(type, key) => emit('onKeyEvent', type, key)"
        />
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
    display: grid;
    place-items: center;
    height: 23%;
    padding: 1%;
  }

  .lt {
    left: 6%;
    top: 8%;
  }

  .rt {
    right: 6%;
    top: 8%;
  }

  .lb-up {
    left: 10%;
    bottom: 40%;
  }

  .lb-left {
    left: 4%;
    bottom: 24%;
  }

  .lb-right {
    left: 16%;
    bottom: 24%;
  }

  .lb-down {
    left: 10%;
    bottom: 8%;
  }

  .rb-a {
    right: 15%;
    bottom: 35%;
  }

  .rb-b {
    right: 5%;
    bottom: 35%;
  }

  .rb-x {
    right: 15%;
    bottom: 10%;
  }

  .rb-y {
    right: 5%;
    bottom: 10%;
  }
}
</style>
