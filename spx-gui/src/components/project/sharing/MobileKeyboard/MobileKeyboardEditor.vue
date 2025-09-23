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
            <div ref="paletteRef" class="palette">
              <div
                v-for="k in autoPool"
                :key="`P-${k}`"
                class="palette-item"
                @pointerdown="startDrag('autoPool', k, $event as PointerEvent)"
              >
                <UIKeyBtn :value="k" />
              </div>
            </div>
          </div>
          <div class="phone-container">
            <div class="phone-1YZxt">
              <img :src="phone" alt="phone" style="transform: rotate(180deg)" />
              <div class="stage-vTZqo" :class="{ dragging: !!drag }">
                <!-- 系统键 2 个 -->
                <div class="zone sysA">
                  <UIButton
                    v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project in full screen' }"
                    icon="rotate"
                  >
                    {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
                  </UIButton>
                </div>
                <div class="zone sysB">
                  <UIButton
                    v-radar="{ name: 'Close full screen', desc: 'Click to close full screen project runner' }"
                    icon="close"
                  >
                    {{ $t({ en: 'Close', zh: '关闭' }) }}
                  </UIButton>
                </div>
                <!-- 左上角 1 个 -->
                <div
                  :ref="(el) => (zoneRefs.lt.value = el as HTMLElement)"
                  :class="{ over: hoverZone === 'lt' }"
                  class="zone lt"
                >
                  <UIKeyBtn
                    v-if="zoneToKey.lt"
                    :value="zoneToKey.lt!"
                    @pointerdown.stop="startDrag('lt', zoneToKey.lt!, $event as PointerEvent)"
                  />
                </div>
                <!-- 右上角 1 个 -->
                <div
                  :ref="(el) => (zoneRefs.rt.value = el as HTMLElement)"
                  class="zone rt"
                  :class="{ over: hoverZone === 'rt' }"
                >
                  <UIKeyBtn
                    v-if="zoneToKey.rt"
                    :value="zoneToKey.rt!"
                    @pointerdown.stop="startDrag('rt', zoneToKey.rt!, $event as PointerEvent)"
                  />
                </div>

                <!-- 左下角 4 个：每个独立 zone -->
                <div
                  :ref="(el) => (zoneRefs.lbUp.value = el as HTMLElement)"
                  class="zone lb-up"
                  :class="{ over: hoverZone === 'lbUp' }"
                >
                  <UIKeyBtn
                    v-if="zoneToKey.lbUp"
                    :value="zoneToKey.lbUp!"
                    @pointerdown.stop="startDrag('lbUp', zoneToKey.lbUp!, $event as PointerEvent)"
                  />
                </div>
                <div
                  :ref="(el) => (zoneRefs.lbLeft.value = el as HTMLElement)"
                  class="zone lb-left"
                  :class="{ over: hoverZone === 'lbLeft' }"
                >
                  <UIKeyBtn
                    v-if="zoneToKey.lbLeft"
                    :value="zoneToKey.lbLeft!"
                    @pointerdown.stop="startDrag('lbLeft', zoneToKey.lbLeft!, $event as PointerEvent)"
                  />
                </div>
                <div
                  :ref="(el) => (zoneRefs.lbRight.value = el as HTMLElement)"
                  class="zone lb-right"
                  :class="{ over: hoverZone === 'lbRight' }"
                >
                  <UIKeyBtn
                    v-if="zoneToKey.lbRight"
                    :value="zoneToKey.lbRight!"
                    @pointerdown.stop="startDrag('lbRight', zoneToKey.lbRight!, $event as PointerEvent)"
                  />
                </div>
                <div
                  :ref="(el) => (zoneRefs.lbDown.value = el as HTMLElement)"
                  class="zone lb-down"
                  :class="{ over: hoverZone === 'lbDown' }"
                >
                  <UIKeyBtn
                    v-if="zoneToKey.lbDown"
                    :value="zoneToKey.lbDown!"
                    @pointerdown.stop="startDrag('lbDown', zoneToKey.lbDown!, $event as PointerEvent)"
                  />
                </div>

                <!-- 右下角 4 个：每个独立 zone -->
                <div
                  :ref="(el) => (zoneRefs.rbA.value = el as HTMLElement)"
                  class="zone rb-a"
                  :class="{ over: hoverZone === 'rbA' }"
                >
                  <UIKeyBtn
                    v-if="zoneToKey.rbA"
                    :value="zoneToKey.rbA!"
                    @pointerdown.stop="startDrag('rbA', zoneToKey.rbA!, $event as PointerEvent)"
                  />
                </div>
                <div
                  :ref="(el) => (zoneRefs.rbB.value = el as HTMLElement)"
                  class="zone rb-b"
                  :class="{ over: hoverZone === 'rbB' }"
                >
                  <UIKeyBtn
                    v-if="zoneToKey.rbB"
                    :value="zoneToKey.rbB!"
                    @pointerdown.stop="startDrag('rbB', zoneToKey.rbB!, $event as PointerEvent)"
                  />
                </div>
                <div
                  :ref="(el) => (zoneRefs.rbX.value = el as HTMLElement)"
                  class="zone rb-x"
                  :class="{ over: hoverZone === 'rbX' }"
                >
                  <UIKeyBtn
                    v-if="zoneToKey.rbX"
                    :value="zoneToKey.rbX!"
                    @pointerdown.stop="startDrag('rbX', zoneToKey.rbX!, $event as PointerEvent)"
                  />
                </div>
                <div
                  :ref="(el) => (zoneRefs.rbY.value = el as HTMLElement)"
                  class="zone rb-y"
                  :class="{ over: hoverZone === 'rbY' }"
                >
                  <UIKeyBtn
                    v-if="zoneToKey.rbY"
                    :value="zoneToKey.rbY!"
                    @pointerdown.stop="startDrag('rbY', zoneToKey.rbY!, $event as PointerEvent)"
                  />
                </div>

                <!-- 拖拽中的浮层（跟随指针） -->
                <div
                  v-if="drag"
                  class="floating"
                  :style="{ transform: `translate(${drag.x - 25}px, ${drag.y - 25}px)` }"
                >
                  <UIKeyBtn :value="drag.value" />
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
              <div ref="paletteRef" class="palette">
                <div
                  v-for="k in allPool"
                  :key="`P-${k}`"
                  class="palette-item"
                  @pointerdown="startDrag('allPool', k, $event as PointerEvent)"
                >
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

const assignedKeys = new Set(Object.values(props.zoneToKeyMapping ?? {}).filter((v): v is string => v != null))

const allPool = ref<string[]>(webKeys.filter((k) => !props.projectKeys?.includes(k) && !assignedKeys.has(k)))
const autoPool = ref<string[]>(props.projectKeys ? props.projectKeys.filter((k) => !assignedKeys.has(k)) : [])
const zones = ['lt', 'rt', 'lbUp', 'lbLeft', 'lbRight', 'lbDown', 'rbA', 'rbB', 'rbX', 'rbY']
type MobileKeyboardZone = (typeof zones)[number]

const zoneToKey = reactive<MobileKeyboardZoneToKeyMapping>(props.zoneToKeyMapping ?? {})

const zoneOriginPool = reactive<Record<MobileKeyboardZone, 'autoPool' | 'allPool' | undefined>>({})

for (const id of zones as MobileKeyboardZone[]) {
  const k = zoneToKey[id]
  if (k) {
    zoneOriginPool[id] = props.projectKeys?.includes(k) ? 'autoPool' : 'allPool'
  }
}

const zoneRefs = Object.fromEntries(zones.map((id) => [id, ref<HTMLElement | null>(null)])) as Record<
  MobileKeyboardZone,
  ReturnType<typeof ref<HTMLElement | null>>
>
const paletteRef = ref<HTMLElement | null>(null)
const drag = ref<{
  value: string
  x: number
  y: number
  source: 'autoPool' | 'allPool' | MobileKeyboardZone
  originPool?: 'autoPool' | 'allPool'
} | null>(null)
const hoverZone = ref<MobileKeyboardZone | null>(null)
function startDrag(source: 'autoPool' | 'allPool' | MobileKeyboardZone, value: string, e: PointerEvent) {
  let originPool: 'autoPool' | 'allPool' | undefined
  if (source === 'autoPool' || source === 'allPool') originPool = source
  else originPool = zoneOriginPool[source]
  // 如果从区域开始拖拽，先清空该区域，等待投放
  if (source !== 'autoPool' && source !== 'allPool') {
    zoneToKey[source] = null
  }
  drag.value = { value, x: e.clientX, y: e.clientY, source, originPool }
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
  // 投放到空区域，若来自池则从池移除；并记录 zone 的来源池子
  for (const id of zones) {
    if (hit(zoneRefs[id]?.value ?? null, e.clientX, e.clientY)) {
      if (zoneToKey[id] == null) {
        zoneToKey[id] = d.value
        if (d.source === 'autoPool') {
          autoPool.value = autoPool.value.filter((v) => v !== d.value)
          zoneOriginPool[id] = 'autoPool'
        } else if (d.source === 'allPool') {
          allPool.value = allPool.value.filter((v) => v !== d.value)
          zoneOriginPool[id] = 'allPool'
        } else {
          // from another zone: transfer origin
          zoneOriginPool[id] = d.originPool ?? 'autoPool'
        }
      }
      hoverZone.value = null
      return
    }
  }
  // // 未命中任何区域或命中已占用，回到来源池子（若来自 zone 则回到其 originPool）
  const targetPoolName = d.source === 'autoPool' || d.source === 'allPool' ? d.source : d.originPool ?? 'autoPool'
  const targetPool = targetPoolName === 'autoPool' ? autoPool : allPool
  if (!targetPool.value.includes(d.value)) targetPool.value.push(d.value)
  hoverZone.value = null
}
function hit(el: HTMLElement | null, x: number, y: number) {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

function confirm() {
  emit('resolved', zoneToKey)
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

.stage-vTZqo {
  position: absolute;
  inset: 0;
  z-index: 2;

  .zone {
    position: absolute;
    display: grid;
    place-items: center;
    border: 2px dashed #fff;
    transition:
      box-shadow 0.15s,
      border-color 0.15s;
  }

  .sysA {
    left: 5%;
    top: 5%;
  }

  .sysB {
    right: 5%;
    top: 5%;
  }

  &.dragging .zone {
    border-color: var(--color-primary);
  }

  .zone.over {
    box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.3) inset;
  }

  .lt {
    left: 6%;
    top: 20%;
    width: 10%;
    height: 14%;
  }

  .rt {
    right: 6%;
    top: 20%;
    width: 10%;
    height: 14%;
  }

  /* 左下四个：独立小区域（放在原 lb 范围内：left:6%; bottom:20%; width:28%; height:28%）*/
  .lb-up {
    left: 20%;
    bottom: 40%;
    width: 10%;
    height: 14%;
  }

  .lb-left {
    left: 10%;
    bottom: 24%;
    width: 10%;
    height: 14%;
  }

  .lb-right {
    left: 30%;
    bottom: 24%;
    width: 10%;
    height: 14%;
  }

  .lb-down {
    left: 20%;
    bottom: 8%;
    width: 10%;
    height: 14%;
  }

  /* 右下四个：独立小区域（放在原 rb 范围内：right:6%; bottom:20%; width:20%; height:20%）*/
  .rb-a {
    right: 20%;
    bottom: 30%;
    width: 10%;
    height: 14%;
  }

  .rb-b {
    right: 5%;
    bottom: 30%;
    width: 10%;
    height: 14%;
  }

  .rb-x {
    right: 20%;
    bottom: 10%;
    width: 10%;
    height: 14%;
  }

  .rb-y {
    right: 5%;
    bottom: 10%;
    width: 10%;
    height: 14%;
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
