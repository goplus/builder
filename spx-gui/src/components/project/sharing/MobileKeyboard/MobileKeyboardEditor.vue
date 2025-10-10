<template>
  <UIFullScreenModal :visible="true">
    <div class="keyboard-editor">
      <div class="header">
        <h1>{{ t({ en: 'Edit Keyboard', zh: '编辑键盘' }) }}</h1>
      </div>

      <div class="content">
        <div class="editor-row">
          <div class="key-pool-side">
            <div class="pool-header">{{ t({ en: 'Recognized Keys', zh: '识别的按键' }) }}</div>
            <div ref="paletteAutoRef" class="palette">
              <div
                v-for="k in autoPool"
                :key="`P-${k}`"
                class="palette-item"
                @pointerdown.stop="startDragPool('autoPool', k, $event as PointerEvent)"
              >
                <UIKeyBtn :web-key-value="k" :active="false" :size="BtnSize" />
              </div>
            </div>
          </div>
          <div class="phone-container">
            <div class="phone-1YZxt">
              <img :src="phone" alt="phone" style="transform: rotate(180deg)" />
              <div class="stage" :class="{ dragging: !!drag }">
                <div
                  v-for="z in zones"
                  :key="z"
                  :ref="(el) => (zoneRefs[z].value = el as HTMLElement)"
                  class="zone"
                  :class="z"
                >
                  <!-- 系统键：在 lt 区域显示重新运行按钮 -->
                  <div v-if="z === 'lt'" class="system-key sysA">
                    <UIButton
                      v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project in full screen' }"
                      :icon="systemKeys?.[0]?.icon"
                    >
                      {{ t({ en: systemKeys?.[0]?.textEn ?? '', zh: systemKeys?.[0]?.textZh ?? '' }) }}
                    </UIButton>
                  </div>
                  <!-- 系统键：在 rt 区域显示关闭按钮 -->
                  <div v-if="z === 'rt'" class="system-key sysB">
                    <UIButton
                      v-radar="{ name: 'Close full screen', desc: 'Click to close full screen project runner' }"
                      :icon="systemKeys?.[1]?.icon"
                    >
                      {{ t({ en: systemKeys?.[1]?.textEn ?? '', zh: systemKeys?.[1]?.textZh ?? '' }) }}
                    </UIButton>
                  </div>
                  <!-- 用户自定义键 -->
                  <div
                    v-for="(k, i) in zoneTokeys[z]"
                    :key="k.keyValue + '-' + i"
                    class="key"
                    :class="{ dragging: drag?.kind === 'key' && drag.zone === z && drag.index === i }"
                    :style="getKeyStyle(z, k.posx, k.posy)"
                    @pointerdown.stop="startDragKey(z, i, $event)"
                  >
                    <UIKeyBtn :web-key-value="k.keyValue" :active="false" :size="BtnSize" />
                  </div>
                </div>

                <!-- 拖拽中的浮层（跟随指针） -->
                <div
                  v-if="drag"
                  class="floating"
                  :style="{ transform: `translate(${drag.x - BtnSize / 2}px, ${drag.y - BtnSize / 2}px)` }"
                >
                  <UIKeyBtn :web-key-value="drag.keyValue" :active="false" :size="BtnSize" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="palette-container">
          <n-space vertical>
            <n-switch v-model:value="show">
              <template #checked>
                {{ t({ en: 'AllKeys-expand', zh: '全部按键-展开' }) }}
              </template>
              <template #unchecked>
                {{ t({ en: 'AllKeys-fold', zh: '全部按键-折叠' }) }}
              </template>
            </n-switch>
            <n-collapse-transition :show="show">
              <div class="pool-header"></div>
              <div ref="paletteAllRef" class="palette">
                <div
                  v-for="k in allPool"
                  :key="`P-${k}`"
                  class="palette-item"
                  @pointerdown.stop="startDragPool('allPool', k, $event as PointerEvent)"
                >
                  <UIKeyBtn :web-key-value="k" :active="false" :size="BtnSize" />
                </div>
              </div>
            </n-collapse-transition>
          </n-space>
        </div>
      </div>

      <div class="footer">
        <UIButton type="primary" @click="confirm">{{ t({ en: 'Confirm', zh: '确定' }) }}</UIButton>
      </div>
    </div>
  </UIFullScreenModal>
</template>

<script setup lang="ts">
import type { MobileKeyboardZoneToKeyMapping } from '@/apis/project'
import type { ModalComponentEmits, ModalComponentProps } from '@/components/ui/modal/UIModalProvider.vue'
import { UIFullScreenModal, UIButton } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { onUnmounted } from 'vue'
import { NSpace, NSwitch, NCollapseTransition } from 'naive-ui'
import type { WebKeyValue } from './mobile-keyboard'
import { zones, systemKeys, getKeyStyle } from './mobile-keyboard'
import type { ZoneId } from './mobile-keyboard'
import UIKeyBtn from './UIKeyBtn.vue'
import phone from './mobile.png'
import { reactive, ref } from 'vue'
import { webKeys } from '@/utils/spx'
defineOptions({ name: 'MobileKeyboardEdit' })
const props = defineProps<
  ModalComponentProps & {
    zoneToKeyMapping: MobileKeyboardZoneToKeyMapping | null
    projectKeys: WebKeyValue[] | null
  }
>()
const emit = defineEmits<ModalComponentEmits<MobileKeyboardZoneToKeyMapping>>()
const show = ref(false)
const { t } = useI18n()
const BtnSize = 50
const assignedKeys = new Set(
  Object.values(props.zoneToKeyMapping ?? {})
    .flatMap((arr) => arr ?? [])
    .map((btn) => btn.webKeyValue)
)
const allPool = ref<string[]>(webKeys.filter((k) => !props.projectKeys?.includes(k) && !assignedKeys.has(k)))
const autoPool = ref<string[]>(props.projectKeys ? props.projectKeys.filter((k) => !assignedKeys.has(k)) : [])

type KeyPos = { keyValue: WebKeyValue; posx: number; posy: number; origin?: 'autoPool' | 'allPool' }

const initZoneTokeys = () => {
  const result: Record<ZoneId, KeyPos[]> = { lt: [], rt: [], lb: [], rb: [] }
  const mapping = props.zoneToKeyMapping ?? { lt: [], rt: [], lb: [], rb: [] }
  for (const id of zones) {
    const arr = mapping[id] ?? []
    result[id] = arr.map((btn) => ({ keyValue: btn.webKeyValue, posx: btn.posx, posy: btn.posy }))
  }
  return result
}

const zoneTokeys = reactive<Record<ZoneId, KeyPos[]>>(initZoneTokeys())

const zoneRefs = Object.fromEntries(zones.map((id) => [id, ref<HTMLElement | null>(null)])) as Record<
  ZoneId,
  ReturnType<typeof ref<HTMLElement | null>>
>
const paletteAutoRef = ref<HTMLElement | null>(null)
const paletteAllRef = ref<HTMLElement | null>(null)
type DragState =
  | { kind: 'pool'; from: 'autoPool' | 'allPool'; keyValue: string; x: number; y: number }
  | {
      kind: 'key'
      zone: ZoneId
      index: number
      keyValue: string
      x: number
      y: number
      originFrom: 'autoPool' | 'allPool'
    }
const drag = ref<DragState | null>(null)
const hoverZone = ref<ZoneId | null>(null)

function startDragPool(from: 'autoPool' | 'allPool', keyValue: string, e: PointerEvent) {
  drag.value = { kind: 'pool', from, keyValue, x: e.clientX, y: e.clientY }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}

function startDragKey(zone: ZoneId, index: number, e: PointerEvent) {
  const k = zoneTokeys[zone][index]
  if (!k) return

  drag.value = {
    kind: 'key',
    zone,
    index,
    keyValue: k.keyValue,
    x: e.clientX,
    y: e.clientY,
    originFrom: k.origin ?? (props.projectKeys?.includes(k.keyValue) ? 'autoPool' : 'allPool')
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}
function onMove(e: PointerEvent) {
  if (!drag.value) return
  drag.value.x = e.clientX
  drag.value.y = e.clientY
  hoverZone.value = null
  for (const id of zones) {
    if (hit(zoneRefs[id]?.value ?? null, e.clientX, e.clientY)) {
      hoverZone.value = id
      break
    }
  }
}
function onUp(e: PointerEvent) {
  window.removeEventListener('pointermove', onMove)
  const d = drag.value
  drag.value = null
  if (!d) {
    hoverZone.value = null
    return
  }
  const targetZone = zones.find((id) => hit(zoneRefs[id]?.value ?? null, e.clientX, e.clientY)) ?? null

  if (d.kind === 'pool') {
    if (targetZone) {
      const [px, py] = getPixelInZone(targetZone, e.clientX, e.clientY)
      zoneTokeys[targetZone].push({ keyValue: d.keyValue, posx: px, posy: py, origin: d.from })
      if (d.from === 'autoPool') autoPool.value = autoPool.value.filter((v) => v !== d.keyValue)
      else allPool.value = allPool.value.filter((v) => v !== d.keyValue)
    }
    hoverZone.value = null
    return
  }

  // d.kind === 'key'
  const fromZone = d.zone
  if (targetZone && targetZone !== fromZone) {
    const [px, py] = getPixelInZone(targetZone, e.clientX, e.clientY)
    const item = zoneTokeys[fromZone].splice(d.index, 1)[0]
    if (item)
      zoneTokeys[targetZone].push({ keyValue: item.keyValue, posx: px, posy: py, origin: item.origin ?? d.originFrom })
  } else if (targetZone === fromZone) {
    const [px, py] = getPixelInZone(fromZone, e.clientX, e.clientY)
    const kp = zoneTokeys[fromZone][d.index]
    if (kp) {
      kp.posx = px
      kp.posy = py
    }
  } else {
    // 未命中区域：无论是否命中面板，都回到原始池子
    const item = zoneTokeys[fromZone].splice(d.index, 1)[0]
    if (item) {
      const origin = item.origin ?? d.originFrom
      if (origin === 'autoPool') {
        if (!autoPool.value.includes(item.keyValue)) autoPool.value.push(item.keyValue)
      } else {
        if (!allPool.value.includes(item.keyValue)) allPool.value.push(item.keyValue)
      }
    }
  }
  hoverZone.value = null
}
function hit(el: HTMLElement | null, x: number, y: number) {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return (
    x - BtnSize / 2 >= r.left && x + BtnSize / 2 <= r.right && y - BtnSize / 2 >= r.top && y + BtnSize / 2 <= r.bottom
  )
}

function getPixelInZone(zone: ZoneId, clientX: number, clientY: number): [number, number] {
  const el = zoneRefs[zone]?.value
  if (!el) return [0, 0]
  const r = el.getBoundingClientRect()
  let px = 0,
    py = 0

  switch (zone) {
    case 'lt': // 左上角
      px = clientX - r.left
      py = clientY - r.top
      break
    case 'rt': // 右上角
      px = r.right - clientX
      py = clientY - r.top
      break
    case 'lb': // 左下角
      px = clientX - r.left
      py = r.bottom - clientY
      break
    case 'rb': // 右下角
      px = r.right - clientX
      py = r.bottom - clientY
      break
  }

  return [px, py]
}

function confirm() {
  // 转换 zoneTokeys 数据格式为 MobileKeyboardZoneToKeyMapping
  const result: MobileKeyboardZoneToKeyMapping = {
    lt: zoneTokeys.lt.map((k) => ({ webKeyValue: k.keyValue, posx: k.posx, posy: k.posy })),
    rt: zoneTokeys.rt.map((k) => ({ webKeyValue: k.keyValue, posx: k.posx, posy: k.posy })),
    lb: zoneTokeys.lb.map((k) => ({ webKeyValue: k.keyValue, posx: k.posx, posy: k.posy })),
    rb: zoneTokeys.rb.map((k) => ({ webKeyValue: k.keyValue, posx: k.posx, posy: k.posy }))
  }

  emit('resolved', result)
}
onUnmounted(() => {
  onUnmounted(() => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    drag.value = null
    hoverZone.value = null
  })
})
</script>

<style scoped lang="scss">
@use './mobile-keyboard.scss' as *;

.keyboard-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  -webkit-user-select: none;
  user-select: none;
}

.header {
  text-align: center;
  margin-bottom: 10px;

  h1 {
    font-size: 25px;
    font-weight: 600;
    color: var(--ui-color-title);
    margin: 0;
  }
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  overflow: auto;
  justify-content: center;

  .editor-row {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: center;
    gap: 50px;
  }
}

.phone-container {
  flex-shrink: 0;
}

.phone-1YZxt {
  position: relative;
  display: inline-block;

  img {
    display: block;
    width: 750px;
    height: auto;
  }
}

.phone-img {
  display: block;
  max-width: 100%;
  height: auto;
}

.stage {
  position: absolute;
  inset: 0;
  z-index: 2;

  .zone {
    @include zone-base(true);
    @include zone-directions;
  }

  .key {
    position: absolute;
    transform: translate(-50%, -50%);

    &.dragging {
      opacity: 0;
      pointer-events: none;
    }
  }

  .system-key {
    position: absolute;
    z-index: 3;
    pointer-events: none;
    @include sys-btn;
  }

  &.dragging .zone {
    border-color: var(--color-primary);
  }

  .zone.over {
    box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.3) inset;
  }

  .floating {
    position: fixed;
    left: 0;
    top: 0;
    pointer-events: none;
    z-index: 5;
  }
}

.key-pool-side {
  flex-shrink: 0;
  width: 100%;
  max-width: 350px;
  display: flex;
  flex-direction: column;
}

.key-pool-side .palette {
  flex: 1;
  /* fill column height */
  overflow: auto;
  /* scroll if taller than phone */
}

.palette-container {
  flex-shrink: 0;
  width: 100%;
  max-width: 1200px;
}

.pool-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-color-title);
  margin-bottom: 8px;
}

.palette {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 16px;
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-1);
  border: 1px solid var(--ui-color-dividing-line-2);
}

.palette-item {
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid var(--ui-color-dividing-line-1);
  margin-top: 24px;
}
</style>
