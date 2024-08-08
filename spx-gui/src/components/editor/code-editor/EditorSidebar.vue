<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import {
  controlCategory,
  eventCategory,
  gameCategory,
  getVariableCategory,
  lookCategory,
  motionCategory,
  sensingCategory,
  soundCategory,
  ToolContext,
  type ToolGroup
} from '@/components/editor/code-editor/code-text-editor'
import ToolItem from './ToolItem.vue'
import iconEvent from './icons/event.svg?raw'
import iconLook from './icons/look.svg?raw'
import iconMotion from './icons/motion.svg?raw'
import iconSound from './icons/sound.svg?raw'
import iconControl from './icons/control.svg?raw'
import iconGame from './icons/game.svg?raw'
import iconSensing from './icons/sensing.svg?raw'
import iconVariable from './icons/variable.svg?raw'
import { useUIVariables } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'

defineEmits<{
  insertText: [insertText: string]
}>()

const uiVariables = useUIVariables()
const editorCtx = useEditorCtx()

const variablesDefs = computed(() => getVariableCategory(editorCtx.project))

const categories = computed(() => {
  return [
    {
      icon: iconEvent,
      color: '#fabd2c',
      ...eventCategory
    },
    {
      icon: iconLook,
      color: '#fd8d60',
      ...lookCategory
    },
    {
      icon: iconMotion,
      color: '#91d644',
      ...motionCategory
    },
    {
      icon: iconControl,
      color: '#3fcdd9',
      ...controlCategory
    },
    {
      icon: iconSensing,
      color: '#4fc2f8',
      ...sensingCategory
    },
    {
      icon: iconSound,
      color: uiVariables.color.sound.main,
      ...soundCategory
    },
    {
      icon: iconVariable,
      color: '#5a7afe',
      ...variablesDefs.value
    },
    {
      icon: iconGame,
      color: '#e14e9f',
      ...gameCategory
    }
  ].map((c) => ({ ...c, groups: filterGroups(c.groups) }))
})

function filterGroups(groups: ToolGroup[]) {
  const isSprite = editorCtx.project.selected?.type === 'sprite'
  return groups
    .map((g) => ({
      ...g,
      tools: g.tools.filter((d) => {
        if (d.target === ToolContext.all) return true
        const target = isSprite ? ToolContext.sprite : ToolContext.stage
        return d.target === target
      })
    }))
    .filter((g) => g.tools.length > 0)
}

const activeCategoryIndex = shallowRef(0)
const activeCategory = computed(() => categories.value[activeCategoryIndex.value])

function handleCategoryClick(index: number) {
  activeCategoryIndex.value = index
}
</script>

<template>
  <!--  this ul element area is sidebar tab nav  -->
  <ul class="categories-wrapper">
    <li
      v-for="(category, i) in categories"
      v-show="category.groups.length > 0"
      :key="i"
      class="category"
      :class="{ active: i === activeCategoryIndex }"
      :style="{ '--category-color': category.color }"
      @click="handleCategoryClick(i)"
    >
      <!-- eslint-disable vue/no-v-html -->
      <div class="icon" v-html="category.icon"></div>
      <p class="label">{{ $t(category.label) }}</p>
    </li>
  </ul>
  <!--  this area this used for sidebar main content display like: code shortcut input, document detail view, etc.  -->
  <div class="tools-wrapper">
    <h4 class="title">{{ $t(activeCategory.label) }}</h4>
    <div v-for="(group, i) in activeCategory.groups" :key="i" class="def-group">
      <h5 class="group-title">{{ $t(group.label) }}</h5>
      <div class="defs">
        <ToolItem
          v-for="(def, j) in group.tools"
          :key="j"
          :tool="def"
          @use-snippet="$emit('insertText', $event)"
        />
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.categories-wrapper {
  flex: 0 0 auto;
  padding: 12px 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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

  &.active {
    color: var(--ui-color-grey-100);
    background-color: var(--category-color);
    cursor: default;
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

.tools-wrapper {
  // 162px is the max width of def buttons, use 162px as base width
  // to keep tools-wrapper's width stable when switch among different def categories
  flex: 1 0 162px;
  padding: 12px;
  background-color: var(--ui-color-grey-300);
  overflow-y: auto;

  .title {
    font-size: var(--ui-font-size-text);
    color: var(--ui-color-title);
  }

  .def-group {
    margin: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    + .def-group {
      padding-top: 12px;
      border-top: 1px dashed var(--ui-color-border);
    }
  }

  .group-title {
    color: var(--ui-color-grey-700);
    font-size: 12px;
    line-height: 1.5;
  }

  .defs {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}
</style>
