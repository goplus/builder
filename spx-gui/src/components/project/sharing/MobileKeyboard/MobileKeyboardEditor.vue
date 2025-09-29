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
              <div v-for="k in autoPool" :key="`P-${k}`" class="palette-item"
                @pointerdown="startDragPool('autoPool', k, $event as PointerEvent)">
                <UIKeyBtn :value="k" />
              </div>
            </div>
          </div>
          <div class="phone-container">
            <div class="phone-1YZxt">
              <img :src="phone" alt="phone" style="transform: rotate(180deg)" />
              <div class="stage" :class="{ dragging: !!drag }">
                <div v-for="z in zones" :key="z" class="zone" :class="z"
                  :ref="(el) => (zoneRefs[z].value = el as HTMLElement)">
                  <!-- 系统键：在 lt 区域显示重新运行按钮 -->
                  <div v-if="z === 'lt'" class="system-key" style="left: 10px; top: 10px;">
                    <UIButton v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project in full screen' }"
                      icon="rotate" size="small">
                      {{ t({ en: 'Rerun', zh: '重新运行' }) }}
                    </UIButton>
                  </div>
                  <!-- 系统键：在 rt 区域显示关闭按钮 -->
                  <div v-if="z === 'rt'" class="system-key" style="right: 10px; top: 10px;">
                    <UIButton v-radar="{ name: 'Close full screen', desc: 'Click to close full screen project runner' }"
                      icon="close" size="small">
                      {{ t({ en: 'Close', zh: '关闭' }) }}
                    </UIButton>
                  </div>
                  <!-- 用户自定义键 -->
                  <div v-for="(k, i) in zoneTokeys[z]" :key="k.keyValue + '-' + i" class="key"
                    :class="{ dragging: drag?.kind === 'key' && drag.zone === z && drag.index === i }"
                    :style="getKeyStyle(z, k.posx, k.posy)" @pointerdown.stop="startDragKey(z, i, $event)">
                    <UIKeyBtn :value="k.keyValue" :active="false" />
                  </div>
                </div>

                <!-- 拖拽中的浮层（跟随指针） -->
                <div v-if="drag" class="floating"
                  :style="{ transform: `translate(${drag.x - 25}px, ${drag.y - 25}px)` }">
                  <UIKeyBtn :value="drag.keyValue" :active="false" />
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
                <div v-for="k in allPool" :key="`P-${k}`" class="palette-item"
                  @pointerdown="startDragPool('allPool', k, $event as PointerEvent)">
                  <UIKeyBtn :value="k" />
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
import type { KeyCode } from './mobile-keyboard'
defineOptions({ name: 'MobileKeyboardEdit' })
const props = defineProps<
  ModalComponentProps & {
    zoneToKeyMapping: MobileKeyboardZoneToKeyMapping | null
    projectKeys: KeyCode[] | null
  }
>()
const emit = defineEmits<ModalComponentEmits<MobileKeyboardZoneToKeyMapping>>()
const show = ref(false)
const { t } = useI18n()
import UIKeyBtn from './UIKeyBtn.vue'
import phone from './mobile.png'
import { reactive, ref } from 'vue'
import { webKeys } from '@/utils/spx'

const assignedKeys = new Set(
  Object.values(props.zoneToKeyMapping ?? {})
    .flatMap((arr) => arr ?? [])
    .map((btn) => btn.label)
)

const allPool = ref<string[]>(webKeys.filter((k) => !props.projectKeys?.includes(k) && !assignedKeys.has(k)))
const autoPool = ref<string[]>(props.projectKeys ? props.projectKeys.filter((k) => !assignedKeys.has(k)) : [])
const zones = ['lt', 'rt', 'lb', 'rb'] as const
type ZoneId = (typeof zones)[number]
type KeyPos = { keyValue: string, posx: number, posy: number, origin?: 'autoPool' | 'allPool' }

// 直接使用 props 数据，只需转换 label 到 keyValue
const initZoneTokeys = () => {
  const result: Record<ZoneId, KeyPos[]> = { lt: [], rt: [], lb: [], rb: [] }
  const mapping = props.zoneToKeyMapping ?? { lt: [], rt: [], lb: [], rb: [] }
  for (const id of zones) {
    const arr = mapping[id] ?? []
    result[id] = arr.map((btn) => ({ keyValue: btn.label, posx: btn.posx, posy: btn.posy }))
  }
  return result
}

const zoneTokeys = reactive<Record<ZoneId, KeyPos[]>>(initZoneTokeys())


const zoneToKey = reactive<MobileKeyboardZoneToKeyMapping>(props.zoneToKeyMapping ?? { lt: [], rt: [], lb: [], rb: [] })

const zoneOriginPool = reactive<Record<ZoneId, 'autoPool' | 'allPool' | undefined>>({ lt: undefined, rt: undefined, lb: undefined, rb: undefined })

for (const id of zones) {
  const k = zoneToKey[id]
  if (k) {
    const hasProjectKey = (k ?? []).some(btn => (props.projectKeys?.includes(btn.label) ?? false))
    zoneOriginPool[id] = hasProjectKey ? 'autoPool' : 'allPool'
  }
}

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
    // 记录拖拽开始时鼠标相对于按键的偏移
    offsetX: number
    offsetY: number
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

  // 计算鼠标相对于按键当前位置的偏移
  const zoneEl = zoneRefs[zone]?.value
  if (!zoneEl) return

  const zoneRect = zoneEl.getBoundingClientRect()
  let keyX: number, keyY: number

  // 根据不同角落计算按键的绝对位置
  switch (zone) {
    case 'lt':
      keyX = zoneRect.left + k.posx
      keyY = zoneRect.top + k.posy
      break
    case 'rt':
      keyX = zoneRect.right - k.posx
      keyY = zoneRect.top + k.posy
      break
    case 'lb':
      keyX = zoneRect.left + k.posx
      keyY = zoneRect.bottom - k.posy
      break
    case 'rb':
      keyX = zoneRect.right - k.posx
      keyY = zoneRect.bottom - k.posy
      break
    default:
      keyX = zoneRect.left + k.posx
      keyY = zoneRect.top + k.posy
  }

  drag.value = {
    kind: 'key',
    zone,
    index,
    keyValue: k.keyValue,
    x: e.clientX,
    y: e.clientY,
    originFrom: k.origin ?? (props.projectKeys?.includes(k.keyValue) ? 'autoPool' : 'allPool'),
    offsetX: e.clientX - keyX,
    offsetY: e.clientY - keyY
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
  // 拖拽过程中不实时更新按键位置，只在松开时更新
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
    // 跨区域移动时也使用偏移量
    const adjustedX = e.clientX - (d.kind === 'key' ? d.offsetX : 0)
    const adjustedY = e.clientY - (d.kind === 'key' ? d.offsetY : 0)
    const [px, py] = getPixelInZone(targetZone, adjustedX, adjustedY)
    const item = zoneTokeys[fromZone].splice(d.index, 1)[0]
    if (item) zoneTokeys[targetZone].push({ keyValue: item.keyValue, posx: px, posy: py, origin: item.origin ?? d.originFrom })
  } else if (targetZone === fromZone) {
    // 使用偏移量计算正确的位置
    const adjustedX = e.clientX - (d.kind === 'key' ? d.offsetX : 0)
    const adjustedY = e.clientY - (d.kind === 'key' ? d.offsetY : 0)
    const [px, py] = getPixelInZone(fromZone, adjustedX, adjustedY)
    const kp = zoneTokeys[fromZone][d.index]
    if (kp) {
      console.log('更新位置:', { zone: fromZone, oldPos: { x: kp.posx, y: kp.posy }, newPos: { x: px, y: py }, offset: d.kind === 'key' ? { x: d.offsetX, y: d.offsetY } : null })
      kp.posx = px; kp.posy = py
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
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

function getKeyStyle(zone: ZoneId, posx: number, posy: number) {
  // 根据不同角落计算CSS定位
  switch (zone) {
    case 'lt': // 左上角
      return { left: posx + 'px', top: posy + 'px', touchAction: 'none' }
    case 'rt': // 右上角
      return { right: posx + 'px', top: posy + 'px', touchAction: 'none' }
    case 'lb': // 左下角
      return { left: posx + 'px', bottom: posy + 'px', touchAction: 'none' }
    case 'rb': // 右下角
      return { right: posx + 'px', bottom: posy + 'px', touchAction: 'none' }
    default:
      return { left: posx + 'px', top: posy + 'px', touchAction: 'none' }
  }
}

function getPixelInZone(zone: ZoneId, clientX: number, clientY: number): [number, number] {
  const el = zoneRefs[zone]?.value
  if (!el) return [0, 0]
  const r = el.getBoundingClientRect()

  // 根据不同角落计算相对坐标
  // 由于按键使用了 transform: translate(-50%, -50%)，我们需要计算按键中心点的位置
  let px: number, py: number
  switch (zone) {
    case 'lt': // 左上角 - 坐标就是相对左上角的距离
      px = clientX - r.left
      py = clientY - r.top
      break
    case 'rt': // 右上角 - 坐标是相对右上角的距离
      px = r.right - clientX
      py = clientY - r.top
      break
    case 'lb': // 左下角 - 坐标是相对左下角的距离
      px = clientX - r.left
      py = r.bottom - clientY
      break
    case 'rb': // 右下角 - 坐标是相对右下角的距离
      px = r.right - clientX
      py = r.bottom - clientY
      break
    default:
      px = clientX - r.left
      py = clientY - r.top
  }

  return [px, py]
}

function confirm() {
  // 转换 zoneTokeys 数据格式为 MobileKeyboardZoneToKeyMapping
  const result: MobileKeyboardZoneToKeyMapping = {
    lt: zoneTokeys.lt.map(k => ({ label: k.keyValue, posx: k.posx, posy: k.posy })),
    rt: zoneTokeys.rt.map(k => ({ label: k.keyValue, posx: k.posx, posy: k.posy })),
    lb: zoneTokeys.lb.map(k => ({ label: k.keyValue, posx: k.posx, posy: k.posy })),
    rb: zoneTokeys.rb.map(k => ({ label: k.keyValue, posx: k.posx, posy: k.posy }))
  }

  console.log('提交的数据:', result)
  emit('resolved', result)
}
onUnmounted(() => {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
})

</script>

<style scoped lang="scss">
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
    position: absolute;
    width: 30%;
    height: 42%;
    border: 2px dashed #fff;
    transition:
      box-shadow 0.15s,
      border-color 0.15s;
  }

  .zone.lt {
    left: 20px;
    top: 20px;
  }

  .zone.rt {
    right: 20px;
    top: 20px;
  }

  .zone.lb {
    left: 20px;
    bottom: 20px;
  }

  .zone.rb {
    right: 20px;
    bottom: 20px;
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
    pointer-events: auto;
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