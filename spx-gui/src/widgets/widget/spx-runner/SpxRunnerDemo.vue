<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-28 09:15:20
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-09 14:48:30
 * @FilePath: \builder\spx-gui\src\widgets\widget\spx-runner\SpxRunnerDemo.vue
 * @Description: 
-->
<template>
  <div class="spx-runner-demo">
    <input v-model="projectid" />
    <SpxRunner :projectid="projectid" />
  </div>
</template>
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { onMounted, ref } from 'vue'
import SpxRunner from './SpxRunner.ce.vue'
const route = useRoute()
const projectid = ref<string>()
onMounted(() => {
  console.log('router:', route.params.id)
  if (route.params.id) {
    console.log('router:', route.params.id)
    projectid.value = route.params.id as string
  }
})
</script>
<style scoped lang="scss">
.spx-runner-demo {
  width: 300px;
  height: 300px;
}
</style>
