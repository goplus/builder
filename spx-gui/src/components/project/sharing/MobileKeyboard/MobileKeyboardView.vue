<script setup lang="ts">
import type { MobileKeyboardZoneToKeyMapping } from '@/apis/project'
import { UIButton } from '@/components/ui'
import UIKeyBtn from './UIKeyBtn.vue'
import { reactive } from 'vue'
import type { KeyboardEventType, WebKeyValue } from './mobile-keyboard'
import { zones, systemKeys, getKeyStyle } from './mobile-keyboard'
defineOptions({ name: 'MobileKeyboardView' })
const props = defineProps<{
  zoneToKeyMapping: MobileKeyboardZoneToKeyMapping
}>()
const emit = defineEmits<{
  close: []
  rerun: []
  key: [type: KeyboardEventType, key: WebKeyValue]
}>()

const zoneToKeys = reactive<MobileKeyboardZoneToKeyMapping>(props.zoneToKeyMapping)

function dispatchKeyEvent(type: KeyboardEventType, key: WebKeyValue) {
  emit('key', type, key)
}
</script>

<template>
  <div class="phone-1YZxt">
    <slot name="gameView" class="game-view"></slot>
    <div class="stage-vTZqo">
      <div class="system-key sysA">
        <UIButton
          v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project in full screen' }"
          class="button"
          :icon="systemKeys?.[0]?.icon"
          @click="emit('rerun')"
        >
          {{ $t({ en: systemKeys?.[0]?.textEn ?? '', zh: systemKeys?.[0]?.textZh ?? '' }) }}
        </UIButton>
      </div>
      <div class="system-key sysB">
        <UIButton
          v-radar="{ name: 'Close full screen', desc: 'Click to close full screen project runner' }"
          class="button"
          :icon="systemKeys?.[1]?.icon"
          @click="emit('close')"
        >
          {{ $t({ en: systemKeys?.[1]?.textEn ?? '', zh: systemKeys?.[1]?.textZh ?? '' }) }}
        </UIButton>
      </div>

      <div v-for="z in zones" :key="z" class="zone" :class="z">
        <div
          v-for="btn in zoneToKeys[z] || []"
          :key="btn.webKeyValue"
          class="key"
          :style="getKeyStyle(z, btn.posx, btn.posy)"
        >
          <UIKeyBtn :web-key-value="btn.webKeyValue" :active="true" @key="dispatchKeyEvent" />
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@use './mobile-keyboard.scss' as *;

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
  position: absolute;
  inset: 0;
  z-index: 2;

  .system-key {
    position: absolute;
    z-index: 3;
    @include sys-btn;
  }

  .zone {
    @include zone-base(false);
    @include zone-directions;
  }

  .key {
    position: absolute;
    transform: translate(-50%, -50%);
  }
}
</style>
