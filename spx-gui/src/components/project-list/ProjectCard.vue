<template>
    <n-badge :value="project.source ? 'Cloud' : 'Local'" :offset="['-50%', '75%']">
        <n-card hoverable>
            <div class="project-card-description">
            </div>
            <template #header>
                <p class="title">{{ project.title || project.id }}</p>
            </template>
            <template #footer>
                <p class="id">ID: {{ project.id }}</p>
                <p class="version">version: {{ project.version }}</p>
            </template>
            <template #action>
                <n-button @click="load">Load</n-button>
            </template>
        </n-card>
    </n-badge>
</template>

<script lang="ts" setup>
import type { ProjectSummary } from '@/class/project'
import { defineProps } from 'vue'
import { NCard, NButton, NBadge } from 'naive-ui';
import { useProjectStore } from '@/store';
const props = defineProps<{
    project: ProjectSummary
}>()
const load = () => {
    useProjectStore().loadProject(props.project.id, props.project.source)
}
</script>

<style lang="scss" scoped>
.n-badge {
    width: 100%;

    ::v-deep .n-badge-sup {
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

        p {
            margin: 0;

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

        ::v-deep .n-card__footer {
            padding-top: 10px;
        }

        .n-button {
            width: 100%;
        }
    }
}
</style>