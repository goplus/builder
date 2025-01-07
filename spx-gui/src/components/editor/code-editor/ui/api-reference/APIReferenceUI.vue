<script setup lang="ts">
import { throttle } from 'lodash'
import { computed, ref, watch, watchEffect } from 'vue'
import { type LocaleMessage } from '@/utils/i18n'
import { getCleanupSignal } from '@/utils/disposable'
import { packageSpx } from '@/utils/spx'
import { useUIVariables } from '@/components/ui'
import { mainCategories, stringifyDefinitionId, subCategories } from '../../common'
import type { APIReferenceController, APIReferenceItem } from '.'
import APIReferenceItemComp from './APIReferenceItem.vue'
import iconEvent from './icons/event.svg?raw'
import iconLook from './icons/look.svg?raw'
import iconMotion from './icons/motion.svg?raw'
import iconSound from './icons/sound.svg?raw'
import iconControl from './icons/control.svg?raw'
import iconGame from './icons/game.svg?raw'
import iconSensing from './icons/sensing.svg?raw'

const props = defineProps<{
  controller: APIReferenceController
}>()

const uiVariables = useUIVariables()

type SubCategory = {
  id: string
  label: LocaleMessage
  items: APIReferenceItem[]
}

type MainCategory = {
  id: string
  label: LocaleMessage
  icon: string
  color: string
  subCategories: SubCategory[]
}

/**
 * View info of categories.
 * - Order
 * - Label
 */
const categoriesViewInfo = [
  {
    id: mainCategories.event,
    label: { en: 'Event', zh: '事件' },
    icon: iconEvent,
    color: '#fabd2c',
    subCategories: [
      { id: subCategories.event.game, label: { en: 'Game Events', zh: '游戏事件' } },
      { id: subCategories.event.sensing, label: { en: 'Sensing Events', zh: '感知事件' } },
      { id: subCategories.event.motion, label: { en: 'Motion Events', zh: '运动事件' } },
      { id: subCategories.event.message, label: { en: 'Message Events', zh: '消息事件' } },
      { id: subCategories.event.sprite, label: { en: 'Sprite Events', zh: '精灵事件' } },
      { id: subCategories.event.stage, label: { en: 'Stage Events', zh: '舞台事件' } }
    ]
  },
  {
    id: mainCategories.look,
    label: { en: 'Look', zh: '外观' },
    icon: iconLook,
    color: '#fd8d60',
    subCategories: [
      { id: subCategories.look.visibility, label: { en: 'Visibility', zh: '显示/隐藏' } },
      { id: subCategories.look.behavior, label: { en: 'Behavior', zh: '行为' } },
      { id: subCategories.look.costume, label: { en: 'Costume', zh: '造型' } },
      { id: subCategories.look.animation, label: { en: 'Animation', zh: '动画' } },
      { id: subCategories.look.backdrop, label: { en: 'Backdrop', zh: '背景' } }
    ]
  },
  {
    id: mainCategories.motion,
    label: { en: 'Motion', zh: '运动' },
    icon: iconMotion,
    color: '#91d644',
    subCategories: [
      { id: subCategories.motion.position, label: { en: 'Position', zh: '位置' } },
      { id: subCategories.motion.heading, label: { en: 'Heading', zh: '方向' } },
      { id: subCategories.motion.size, label: { en: 'Size', zh: '大小' } },
      { id: subCategories.motion.rotationStyle, label: { en: 'Rotation', zh: '旋转' } },
      { id: subCategories.motion.others, label: { en: 'Others', zh: '其他' } }
    ]
  },
  {
    id: mainCategories.control,
    label: { en: 'Control', zh: '控制' },
    icon: iconControl,
    color: '#3fcdd9',
    subCategories: [
      { id: subCategories.control.time, label: { en: 'Time', zh: '时间' } },
      { id: subCategories.control.flowControl, label: { en: 'Flow Control', zh: '流程控制' } },
      { id: subCategories.control.declaration, label: { en: 'Declaration', zh: '声明' } }
    ]
  },
  {
    id: mainCategories.sensing,
    label: { en: 'Sensing', zh: '感知' },
    icon: iconSensing,
    color: '#4fc2f8',
    subCategories: [
      { id: subCategories.sensing.distance, label: { en: 'Distance', zh: '距离' } },
      { id: subCategories.sensing.mouse, label: { en: 'Mouse', zh: '鼠标' } },
      { id: subCategories.sensing.keyboard, label: { en: 'Keyboard', zh: '键盘' } }
    ]
  },
  {
    id: mainCategories.sound,
    label: { en: 'Sound', zh: '声音' },
    icon: iconSound,
    color: uiVariables.color.sound.main,
    subCategories: [
      { id: subCategories.sound.playControl, label: { en: 'Play / Stop', zh: '播放/停止' } },
      { id: subCategories.sound.volume, label: { en: 'Volume', zh: '音量' } }
    ]
  },
  {
    id: mainCategories.game,
    label: { en: 'Game', zh: '游戏' },
    icon: iconGame,
    color: '#5a7afe',
    subCategories: [
      { id: subCategories.game.startStop, label: { en: 'Start / Stop', zh: '开始/停止' } },
      { id: subCategories.game.sprite, label: { en: 'Sprite', zh: '精灵' } },
      { id: subCategories.game.others, label: { en: 'Others', zh: '其他' } }
    ]
  }
]

function belongs(item: APIReferenceItem, mcid: string, scid: string) {
  return item.categories.some((c) => c[0] === mcid && c[1] === scid)
}

const itemsForDisplay = computed(() => {
  if (props.controller.items == null) return null
  // There are too many key constants, we exclude them when displaying in list.
  return props.controller.items.filter(
    (item) => !(item.definition.package === packageSpx && item.definition.name?.startsWith('Key'))
  )
})

const categoriesComputed = computed(() => {
  const items = itemsForDisplay.value
  if (items == null) return []
  const result: MainCategory[] = []
  for (const mcvi of categoriesViewInfo) {
    const scs: SubCategory[] = []
    for (const scvi of mcvi.subCategories) {
      const scItems = items.filter((item) => belongs(item, mcvi.id, scvi.id))
      if (scItems.length === 0) continue
      scs.push({ ...scvi, items: scItems })
    }
    if (scs.length === 0) continue
    result.push({ ...mcvi, subCategories: scs })
  }
  return result
})

const activeCategoryIdRef = ref<string | null>(null)

watch(
  categoriesComputed,
  (categories) => {
    if (categories.some((c) => c.id === activeCategoryIdRef.value)) return
    activeCategoryIdRef.value = categories[0]?.id ?? null
  },
  { immediate: true }
)

const itemsWrapperRef = ref<HTMLElement>()

// Update activeCategoryId when scrolling
watchEffect((onCleanup) => {
  const itemsWrapper = itemsWrapperRef.value
  if (itemsWrapper == null) return
  const signal = getCleanupSignal(onCleanup)
  const handleScroll = throttle(() => {
    const scrollTop = itemsWrapper.scrollTop
    const categoryWrappers = itemsWrapper.querySelectorAll('[data-category-id]')
    if (categoryWrappers.length <= 1) return
    for (let i = 1; i < categoryWrappers.length; i++) {
      if ((categoryWrappers[i] as HTMLElement).offsetTop > scrollTop) {
        activeCategoryIdRef.value = categoriesComputed.value[i - 1].id
        break
      }
      if (i === categoryWrappers.length - 1) {
        activeCategoryIdRef.value = categoriesComputed.value[i].id
      }
    }
  }, 100)
  itemsWrapper.addEventListener('scroll', handleScroll, { signal })
})

function handleCategoryClick(id: string) {
  const itemsWrapper = itemsWrapperRef.value
  if (itemsWrapper == null) return
  const categoryWrapper = itemsWrapper.querySelector(`[data-category-id="${id}"]`)
  if (categoryWrapper == null) return
  itemsWrapper.scrollTo({
    top: (categoryWrapper as HTMLElement).offsetTop,
    behavior: 'smooth' // TODO: scroll faster?
  })
}
</script>

<template>
  <section class="api-reference-ui">
    <ul class="categories-wrapper">
      <li
        v-for="c in categoriesComputed"
        :key="c.id"
        class="category"
        :class="{ active: c.id === activeCategoryIdRef }"
        :style="{ '--category-color': c.color }"
        @click="handleCategoryClick(c.id)"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="icon" v-html="c.icon"></div>
        <p class="label">{{ $t(c.label) }}</p>
      </li>
    </ul>
    <ul ref="itemsWrapperRef" class="items-wrapper">
      <li v-for="c in categoriesComputed" :key="c.id" :data-category-id="c.id" class="category-wrapper">
        <ul v-for="sc in c.subCategories" :key="sc.id" class="subcategory-wrapper">
          <h5 class="title">{{ $t(sc.label) }}</h5>
          <ul class="items">
            <APIReferenceItemComp v-for="item in sc.items" :key="stringifyDefinitionId(item.definition)" :item="item" />
          </ul>
        </ul>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.api-reference-ui {
  display: flex;
  justify-content: stretch;
  min-height: 0;
}

.categories-wrapper {
  flex: 0 0 auto;
  padding: 12px 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-right: 1px solid var(--ui-color-dividing-line-2);
}

.category {
  width: 52px;
  height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--ui-border-radius-1);
  color: var(--category-color);
  cursor: pointer;
  transition: 0.1s;

  &.active {
    color: var(--ui-color-grey-100);
    background-color: var(--category-color);
  }

  .icon {
    width: 24px;
    height: 24px;
  }

  .label {
    margin-top: 2px;
    text-align: center;
    font-size: 10px;
    line-height: 1.6;
  }
}

.items-wrapper {
  flex: 1 1 0;
  padding: 0 16px 12px;
  overflow-y: auto;
  scrollbar-width: thin;

  .subcategory-wrapper {
    padding-bottom: 20px;
    border-bottom: 1px dashed var(--ui-color-grey-500);
  }

  .category-wrapper:last-child .subcategory-wrapper:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }

  .title {
    position: sticky;
    z-index: 10;
    top: 0;
    padding: 12px 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ui-color-hint-2);
    background-color: var(--ui-color-grey-100);
  }

  .items {
    display: flex;
    flex-direction: column;
    gap: var(--ui-gap-middle);
  }
}
</style>
