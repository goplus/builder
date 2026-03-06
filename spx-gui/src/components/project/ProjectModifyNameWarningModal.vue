<script setup lang="ts">
import { UIButton, UIFormModal } from '@/components/ui'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

function handleCancel() {
  emit('cancelled')
}
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Project name warning modal', desc: 'Warning modal shown before editing project name' }"
    :title="$t({ en: 'Modify project name', zh: '修改项目名' })"
    :visible="props.visible"
    :mask-closable="false"
    @update:visible="handleCancel"
  >
    <div class="warn-content">
      <div class="warn-tip">
        <span class="warn-tip-icon">!</span>
        <span>
          {{
            $t({
              en: 'Changing the project name may have the following impacts.',
              zh: '修改项目名，可能造成以下影响。'
            })
          }}
        </span>
      </div>
      <ul class="warn-lines">
        <li>
          {{
            $t({
              en: 'The project page URL will change, and existing links will no longer work.',
              zh: '项目页面 URL 将会变更，原有链接将无法访问。'
            })
          }}
        </li>
        <li>
          {{
            $t({
              en: 'Existing sharing links to this project will become invalid.',
              zh: '已有的项目分享链接将会失效。'
            })
          }}
        </li>
        <li>
          {{
            $t({
              en: 'This operation may take a moment to complete.',
              zh: '该操作可能需要一点时间才能完成。'
            })
          }}
        </li>
      </ul>
    </div>
    <footer class="footer center">
      <UIButton
        v-radar="{ name: 'Continue button', desc: 'Click to continue editing project name' }"
        color="danger"
        @click="emit('resolved')"
      >
        {{ $t({ en: 'I understand, let me change the project name', zh: '我已知晓，让我更改项目名' }) }}
      </UIButton>
    </footer>
  </UIFormModal>
</template>

<style scoped lang="scss">
.warn-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--ui-color-grey-800);
  font-size: 14px;
  line-height: 1.6;
}

.warn-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ui-color-yellow-500);
  font-weight: 600;
}

.warn-tip-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--ui-color-yellow-500);
  color: var(--ui-color-grey-100);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  flex: 0 0 auto;
}

.warn-lines {
  margin: 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--ui-color-grey-800);
}

.footer {
  display: flex;
  gap: var(--ui-gap-middle);
  margin-top: var(--ui-gap-large);
  padding-bottom: 4px;
}

.center {
  justify-content: center;
}
</style>
