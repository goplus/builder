<template>
    <n-card id="project-card" hoverable @click="load">
        <button class="icon-delete" @click.stop="remove">
            <i>x</i>
        </button>
        <template #cover>
            <img src="@/assets/image/project/project.png" alt="">
        </template>

        <template #header>
            <p class="title">{{ project.name || project.id }}</p>
        </template>
    </n-card>
</template>

<script lang="ts" setup>
import { removeProject, type ProjectSummary } from '@/class/project'
import { defineProps } from 'vue'
import { NCard, createDiscreteApi } from 'naive-ui';
import { useProjectStore } from '@/store';

const { project } = defineProps<{
    project: ProjectSummary
}>()
const emit = defineEmits(['load-project', 'remove-project'])
const { dialog } = createDiscreteApi(['dialog'])

const load = async () => {
    await useProjectStore().loadProject(project.id, project.source)
    emit('load-project')
}

const remove = () => {
    dialog.warning({
        title: 'Remove Project',
        content: 'Are you sure you want to remove this project (' + (project.name || project.id) + ')? This action cannot be undone.',
        positiveText: 'Yes',
        negativeText: 'No',
        onPositiveClick: async () => {
            await removeProject(project.id, project.source)
            emit('remove-project')
        }
    })
}
</script>

<style lang="scss" scoped>
@import '@/assets/theme.scss';

.n-card {
    width: 100%;
    border-radius: 20px;
    background-color: rgba(252, 228, 236, 0.38);
    box-sizing: border-box;
    cursor: pointer;
    overflow: hidden;

    .icon-delete {
        position: absolute;
        top: 10px;
        right: 10px;
        height: 28px;
        width: 28px;
        text-align: center;
        border-radius: 50%;
        font-weight: bolder;
        cursor: pointer;
        background-color: $background-color;
        border: 1px solid $base-color;

        &:hover {
            filter: brightness(0.95);
        }

        &:active {
            filter: brightness(0.9);
        }

        i {
            color: $base-color;
            font-size: 20px;
            line-height: 1;
            user-select: none;
        }
    }

    p {
        margin: 0;
        font-family: ChauPhilomeneOne, AlibabaPuHuiT, Cherry Bomb, Heyhoo, sans-serif;

        &.title {
            font-size: 18px;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
        }
    }

    :deep(.n-card-header) {
        height: 10px;
        background-color: rgba(252, 228, 236, 0.38);
    }
}
</style>