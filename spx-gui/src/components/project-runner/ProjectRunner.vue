<!--
 * @Author: Hu JingJing
 * @Date: 2024-02-22 17:57:05
 * @LastEditors: Hu JingJing
 * @LastEditTime: 2024-02-26 15:11:06
 * @Description: 
-->
<template>
  <div class="project-runner">
    <iframe ref="iframe" src="/main.html" class="runner" frameborder="0" @load="handleIframeLoad"/>
  </div>
</template>

<script lang="ts" setup>
import { Project } from "@/class/project";
import { ref } from "vue";

interface CustomWindow extends Window {
  loadWasm: () => Promise<void>;
  loadData: (view: ArrayBuffer) => void;
}

const props = defineProps<{ project: Project }>()

const zipResp = fetch('/test.zip')

const iframe = ref<HTMLIFrameElement | null>(null);
const handleIframeLoad = async () => {
  console.log('iframe loaded');
  const runner_window = iframe.value?.contentWindow as CustomWindow
  console.log(runner_window)

  await runner_window?.loadWasm()
  const r = await zipResp
  const buf = await r.arrayBuffer();
  runner_window?.loadData(buf);
};

const run = async () => {
  props.project.run();
  console.log('project run success')
};

const stop = async () => {
  let iframe = document.getElementById('runner') as HTMLIFrameElement
  if (iframe) {
    iframe.src = ''
  }
}

defineExpose({
  run,
  stop
})
</script>

<style lang="scss" scoped>
.project-runner {
  flex: 1;
  text-align: center;
}

.runner {
  width: 100%;
  height: 100%;
}

</style>