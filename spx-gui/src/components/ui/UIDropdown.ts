import { NPopover } from 'naive-ui'
import {
  computed,
  defineComponent,
  h,
  type InjectionKey,
  inject,
  type PropType,
  ref,
  type CSSProperties,
  watchEffect,
  provide,
  watch,
  nextTick,
  type WatchSource,
  toValue
} from 'vue'
import { useContentSize } from '@/utils/dom'
import { usePopupContainer } from './utils'

export type DropdownCtrl = {
  setVisible(visible: boolean): void
}
const dropdownCtrlKey: InjectionKey<DropdownCtrl> = Symbol('dropdown-ctrl')
export function useDropdown() {
  return inject(dropdownCtrlKey)
}

export type Placement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'
export type Trigger = 'click' | 'hover' | 'manual'
export type Pos = {
  x: number
  y: number
  // Optional size (width & height) is supported when positioned manually.
  // When provided, it behaves like positioning with a sized trigger element.
  width?: number
  height?: number
}
export type Offset = {
  x: number
  y: number
}

export type Props = {
  placement?: Placement
  trigger?: Trigger
  visible?: boolean
  pos?: Pos
  offset?: Offset
  showArrow?: boolean
  disabled?: boolean
}

export type Events = {
  'update:visible': (visible: boolean) => void
  clickOutside: (e: MouseEvent) => void
}

export default defineComponent<Props, Events>(
  (props, { slots, emit, expose }) => {
    const attachTo = usePopupContainer()
    const nPopoverRef = ref<InstanceType<typeof NPopover>>()

    const internalVisibleRef = ref(false)
    const visibleComputed = computed(() => props.visible ?? internalVisibleRef.value)

    const extraStyle = computed(() => {
      const placement = props.placement!
      const offset = props.offset!
      const style: CSSProperties = {}
      if (['top', 'top-start', 'top-end'].includes(placement)) {
        style.marginBottom = offset.y + 'px'
      } else {
        style.marginTop = offset.y + 'px'
      }
      if (['top-end', 'bottom-end'].includes(placement)) {
        style.marginRight = -offset.x + 'px'
      } else {
        style.marginLeft = offset.x + 'px'
      }
      return style
    })

    function handleUpdateShow(show: boolean) {
      emit('update:visible', show)
      internalVisibleRef.value = show
    }

    function setVisible(visible: boolean) {
      // `NPopover.setShow` sets show status in uncontrolled mode without triggering the `on-update:show` callback.
      // So we need to manually trigger the `on-update:show` callback.
      nPopoverRef.value?.setShow(visible)
      handleUpdateShow(visible)
    }

    function handleClickOutside(e: MouseEvent) {
      const triggerEl = nPopoverRef.value?.binderInstRef?.targetRef
      // naive-ui triggers `clickoutside` event when trigger-element clicked, so we need to fix it
      if (triggerEl != null && triggerEl.contains(e.target as Node)) return
      emit('clickOutside', e)
    }

    watchEffect((onCleanup) => {
      // Currently, pressing the `Escape` key closes all modals and dropdowns.
      // TODO: Ideally, only the topmost modal or dropdown should be closed.
      function handleDocumentKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') setVisible(false)
      }
      window.addEventListener('keydown', handleDocumentKeydown)
      onCleanup(() => {
        window.removeEventListener('keydown', handleDocumentKeydown)
      })
    })

    provide(dropdownCtrlKey, { setVisible })

    // We create a virtual trigger element to support `props.pos` with size (`width` & `height`).
    const virtualTrigger = computed(() => {
      if (props.pos == null) return null
      if (props.pos.width == null || props.pos.height == null) return null
      return h('div', {
        class: 'virtual-trigger',
        style: {
          pointerEvents: 'none',
          position: 'fixed',
          left: props.pos.x + 'px',
          top: props.pos.y + 'px',
          width: props.pos.width + 'px',
          height: props.pos.height + 'px'
        }
      })
    })
    const popoverPos = computed(() => {
      const pos = props.pos
      if (pos == null) return null
      // When virtual trigger is used, there is no need to set `x` & `y` on `NPopover`.
      if (virtualTrigger.value != null) return null
      return { x: pos.x, y: pos.y }
    })

    watch(virtualTrigger, async () => {
      await nextTick()
      nPopoverRef.value?.syncPosition()
    })

    // Size of popover content may change after it is shown.
    // We need to update the position of popover when its size changes.
    const [popoverWrapperClass, popoverWrapperRef] = usePopoverWrapper(visibleComputed)
    const popoverWrapperSize = useContentSize(popoverWrapperRef)
    watch(popoverWrapperSize, () => {
      nPopoverRef.value?.syncPosition()
    })

    // TODO: proper typing for UIDropdown exposed
    expose({ setVisible })

    return function render() {
      return h(
        NPopover,
        {
          ref: nPopoverRef,
          class: popoverWrapperClass,
          style: {
            overflow: props.showArrow! ? 'visible' : 'hidden',
            borderRadius: 'var(--ui-border-radius-1)',
            backgroundColor: 'var(--ui-color-grey-100)',
            boxShadow: 'var(--ui-box-shadow-big)',
            ...extraStyle.value
          },
          placement: props.placement!,
          trigger: props.trigger!,
          show: props.visible,
          x: popoverPos.value?.x,
          y: popoverPos.value?.y,
          to: attachTo.value,
          showArrow: props.showArrow!,
          raw: true,
          disabled: props.disabled,
          onUpdateShow: handleUpdateShow,
          onClickoutside: handleClickOutside
        },
        {
          default: slots.default,
          trigger: slots.trigger ?? (() => virtualTrigger.value)
        }
      )
    }
  },
  {
    name: 'UIDropdown',
    props: {
      placement: {
        type: String as PropType<Placement>,
        required: false,
        default: 'bottom'
      },
      trigger: {
        type: String as PropType<Trigger>,
        required: false,
        default: 'hover'
      },
      visible: {
        type: Boolean,
        required: false,
        default: undefined
      },
      pos: {
        type: Object as PropType<Pos>,
        required: false,
        default: undefined
      },
      offset: {
        type: Object as PropType<Offset>,
        required: false,
        default: () => ({ x: 0, y: 8 })
      },
      showArrow: {
        type: Boolean,
        required: false,
        default: false
      }
    },
    emits: ['update:visible', 'clickOutside']
  }
)

/**
 * Get the wrapper of popover content.
 * There is no direct way to get the wrapper element of `NPopover` in naive-ui.
 * We use a unique class name to identify it.
 */
function usePopoverWrapper(visibleRef: WatchSource<boolean>) {
  const id = Math.random().toString(36).slice(2)
  const wrapperClass = `ui-dropdown-content-${id}`
  const popoverWrapperRef = ref<HTMLElement | null>(null)

  watchEffect(async () => {
    if (!toValue(visibleRef)) return
    await nextTick()
    const popoverWrapper = document.querySelector(`.${wrapperClass}`)
    if (popoverWrapper == null) return
    popoverWrapperRef.value = popoverWrapper as HTMLElement
  })

  return [wrapperClass, popoverWrapperRef] as const
}
