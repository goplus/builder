<!--
 * @Author: Hu JingJing
 * @Date: 2024-02-22 17:57:05
 * @LastEditors: Hu JingJing
 * @LastEditTime: 2024-02-26 15:11:06
 * @Description: 
-->
<template>
  <div id="project-runner">
    <iframe class="runner" id="runner" frameborder="0" />
  </div>
</template>

<script lang="ts" setup>
import {Project} from "@/class/project";
import { onMounted, ref} from "vue";

const props = defineProps<{
  project: Project,
}>()

onMounted(async () => {
  const iframe = document.getElementById('runner') as HTMLIFrameElement
  iframe.contentWindow?.document.write(html)
})

const run = async () => {
  props.project.run();
  console.log('project run success');
};

const html = `
      <!DOCTYPE html>
      <html>
        <head>
            <script src="/public/js/filesystem.js"><\/script>
            <script src="/public/js/wasm_exec.js"><\/script>
            <script >
              const go = new Go();
              (async () => {
                const wasm = await WebAssembly.instantiateStreaming(
                    fetch("/public/wasm/run.wasm"),
                    go.importObject
                );
                go.run(wasm.instance);
                console.log('wasm run success');
              })();
            <\/script>
        </head>
        <body>
        <\/body>
      <\/html>
`;

defineExpose({
  run
})
</script>

<style lang="scss" scoped>
#project-runner {
  flex: 1;
  text-align: center;
}

.runner {
  width: 100%;
  height: 100%;
}

</style>