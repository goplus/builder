<!--
 * @Author: Hu JingJing
 * @Date: 2024-02-22 17:57:05
 * @LastEditors: Hu JingJing
 * @LastEditTime: 2024-02-26 15:11:06
 * @Description: 
-->
<template>
  <div id="project-runner">
    <iframe class="runner" src="/main.html" frameborder="0" />
  </div>
</template>

<script lang="ts" setup>
import { Project } from "@/class/project";

const props = defineProps<{ project: Project }>();

const run = async () => {
  props.project.run();
  console.log('project run success');
};

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