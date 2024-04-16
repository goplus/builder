# Form

Form-related UI components & helpers.

### Usage

```vue
<template>
  <UIForm :form="form" @submit="handleSubmit">
    <UIFormItem :label="$t({ en: 'Project Name', zh: '项目名' })" path="name">
      <UITextInput v-model:value="form.value.name" />
    </UIFormItem>
    <UIButton html-type="submit">Submit</UIButton>
  </UIForm>
</template>

<script setup lang="ts">
import { UIForm, UIFormItem, UITextInput, useForm } from '@/components/ui'

const form = useForm({
  name: ['', validateName]
})

async function handleSubmit() {
  // if `handleSubmit` is called, the form's input is guaranteed to be valid (all validators passed)
}

async function validateName(name: string) {
  if (name === '') return 'The project name must not be blank'
  // other validate logic...
}
</script>
```
