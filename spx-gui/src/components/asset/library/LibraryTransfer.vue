<template>
  <n-transfer v-model:value="value" :options="options" />
</template>

<script setup lang="ts">
import { defineComponent, ref } from 'vue'
import { categories, type Category } from './category'
import { useI18n } from '@/utils/i18n'
import { NTransfer } from 'naive-ui';

const { t } = useI18n();
const options = ref(createOptions(categories, t));
const value = ref<string[]>([]);


interface TransferOption {
  label: string;
  value: string;
  children?: TransferOption[];
}

function createOptions(categories: Category[], t:any): TransferOption[] {
  return categories.map(category => ({
    label: t(category.message) as string,
    value: category.value,
    children: category.children ? createOptions(category.children, t) : undefined
  }));
}


</script>
