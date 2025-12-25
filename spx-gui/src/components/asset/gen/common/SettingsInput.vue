<script lang="ts" setup>
import { computed, ref } from 'vue'
import { UIButton, UIIcon } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    description: string
    enriching?: boolean
  }>(),
  {
    enriching: false
  }
)

const emit = defineEmits<{
  'update:description': [string]
  enrich: []
}>()

const focus = ref(false)
const enrichShow = computed(() => focus.value && props.description.length > 0)

const onInput = (e: InputEvent) => {
  const target = e.target
  if (target instanceof HTMLTextAreaElement) {
    emit('update:description', target.value)
  }
}
</script>

<template>
  <div class="description-input">
    <div class="main">
      <span v-if="enriching" class="enriching">
        <UIIcon type="edit" />
        {{ $t({ zh: '正在丰富细节', en: 'Enriching details' }) }}<span class="dot">...</span>
      </span>
      <template v-else>
        <div class="mirror" aria-hidden="true">
          <span class="mirror-text">{{ description }}</span>
          <UIButton
            v-if="enrichShow && description.length > 0"
            class="enrich-btn"
            color="secondary"
            size="small"
            variant="stroke"
            @mousedown.prevent
            @click="emit('enrich')"
          >
            <UIIcon type="edit" />
            {{ $t({ zh: '丰富细节', en: 'Enrich details' }) }}
          </UIButton>
        </div>
        <textarea
          class="description"
          :placeholder="$t({ zh: '请输入描述', en: 'Please enter description' })"
          :value="description"
          @input="onInput"
          @focus="focus = true"
          @blur="focus = false"
        />
      </template>
    </div>
    <div class="footer">
      <div class="extra">
        <slot name="extra"></slot>
      </div>
      <slot name="submit"></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.description-input {
  width: 100%;
  min-height: 172px;
  max-height: 300px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-2);
  background: var(--ui-color-grey-100);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: border-color 0.2s ease;

  &:has(.description:focus) {
    border-color: var(--ui-color-turquoise-500);
  }
}

.main {
  position: relative;
  flex: 1;
  padding: 4px 0;
  display: grid;
  overflow-y: auto;

  .enriching {
    display: flex;
    align-items: center;
    gap: 8px;
    height: fit-content;
    color: var(--ui-color-turquoise-500);

    .dot {
      clip-path: inset(0 100% 0 0);
      animation: dot-flow 1.5s steps(4) infinite;
    }

    @keyframes dot-flow {
      to {
        clip-path: inset(0 -0.5em 0 0);
      }
    }
  }

  .description,
  .mirror {
    grid-area: 1 / 1 / 2 / 2;
    padding: 0;
    margin: 0;
    font: inherit;
    font-size: 14px;
    line-height: 1.6;
    width: 100%;
    box-sizing: border-box;
    white-space: pre-wrap;
    word-break: break-all;
    overflow-wrap: anywhere;
  }

  .description {
    border: none;
    resize: none;
    background: transparent;
    color: var(--ui-color-grey-900);
    caret-color: var(--ui-color-turquoise-500);

    &:focus {
      outline: none;
    }
  }

  .mirror-text {
    visibility: hidden;
    pointer-events: none;
    display: inline;
  }

  .enrich-btn {
    display: inline-flex;
    cursor: pointer;
    pointer-events: auto;
    vertical-align: middle;
    margin-left: 12px;
    position: relative;
    top: -2px;
  }
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .extra {
    display: flex;
    gap: 8px;
  }
}
</style>
