<template>
    <n-badge>
        <n-card id="project-card" hoverable @click="load">
            <div class="project-card-description">
            </div>
            <template #cover>
              <img src="@/assets/image/project/project.png" alt="">
            </template>
            <template #header>
                <p class="title">{{ project.name || project.id }}</p>
            </template>
        </n-card>
    </n-badge>
</template>

<script lang="ts" setup>
import type { ProjectSummary } from '@/class/project'
import { defineProps } from 'vue'
import { NCard, NBadge } from 'naive-ui';
import { useProjectStore } from '@/store';

const props = defineProps<{
    project: ProjectSummary
}>()
const emit = defineEmits(['load-project'])

const load = async () => {
  console.log('load project', props.project.id, props.project.source)
  await useProjectStore().loadProject(props.project.id, props.project.source)
  emit('load-project')
}
</script>

<style lang="scss" scoped>
.n-badge {
    width: 100%;

    :deep(.n-badge-sup) {
        height: 36px;
        background: transparent;

        .n-base-slot-machine {
            line-height: 1;
            height: unset;
            font-size: 36px;
            font-weight: bolder;
            color: transparent;
            background: linear-gradient(90deg, #fff0 0%, #ffff 50%, #ffff 100%);
            background-clip: text;
        }
    }

    .n-card {
      width: 100%;
      //height: 150px;
        border-radius: 20px;
        background-color: rgba(252, 228, 236, 0.38);
        margin: 10px;
        box-sizing: border-box;
      cursor: pointer;
      overflow: hidden;

        p {
            margin: 0;
          font-family: ChauPhilomeneOne, AlibabaPuHuiT, Cherry Bomb, Heyhoo, sans-serif;

            &.title {
                font-size: 18px;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }

            &.id {
                font-size: 12px;
                color: #a4a4a3;
                margin-bottom: 10px;
            }
        }

        :deep(.n-card__footer) {
            padding-top: 10px;
        }

        .n-button {
            width: 100%;
        }

        ::v-deep .n-card-header {
          height: 10px;
          border-radius: 0 0 20px 20px;
          background-color: rgba(252, 228, 236, 0.38);
          //background-color: #ffffff;
            text-align: center;
        }
    }
}
</style>