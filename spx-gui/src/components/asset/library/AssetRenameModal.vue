<template>
  <UIFormModal
    :title="$t({ en: 'Rename', zh: '重命名' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <UIForm :form="form" @submit="handleSubmit">
      <main class="main">
        <div class="inputs">
          <UIFormItem path="name">
            <UITextInput v-model:value="form.value.name" />
            <template #tip>{{ $t(nameTip) }}</template>
          </UIFormItem>
          <!-- Add a radio group for the asset category/isPublic -->
        </div>
      </main>
      <footer class="footer">
        <UIButton type="primary" html-type="submit">
          {{ $t({ en: 'Confirm', zh: '确认' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

<script setup lang="ts">
import {
  UIForm,
  UIFormItem,
  UITextInput,
  UIButton,
  UIFormModal,
  useForm} from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { categoryAll } from './category'

const props = defineProps<{
  visible: boolean
  displayName: string
}>()

const emit = defineEmits<{
  changed: [string]
  cancelled: []
  resolved: []
}>()

const { t } = useI18n()

const form = useForm({
  name: [props.displayName, validateName],
  category: [categoryAll.value],
  isPublic: [false]
})


const nameTip = {
  en: 'A good name makes it easy to be found in asset library.',
  zh: '起一个准确的名字，可以帮助你下次更快地找到它'
}

const handleSubmit = ()=>{
  if(form.value.name !== props.displayName){
    emit('changed', form.value.name)
    emit('resolved')
  }else{
    emit('cancelled')
  }
}

function validateName(name: string) {
  name = name.trim()
  if (name === '') return t({ en: 'The asset name must not be blank', zh: '名称不可为空' })
  if (name.length > 100)
    return t({
      en: 'The name is too long (maximum is 100 characters)',
      zh: '名字长度超出限制（最多 100 个字符）'
    })
}
</script>

<style scoped lang="scss">
.main {
  display: flex;
}

.sider {
  flex: 0 0 auto;
  padding: 20px 24px;

  .preview {
    width: 112px;
    height: 84px;
    border-radius: 8px;
    background-color: var(--ui-color-grey-300);
  }
}

.inputs {
  flex: 1 1 0;
  padding: 20px 24px 40px;
}

.footer {
  display: flex;
  justify-content: center;
}
</style>
