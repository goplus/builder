<template>
    <n-badge :value="project.source ? 'Cloud' : 'Local'" :offset="['-50%', '75%']">
        <n-card hoverable :title="project.title">
            <div class="project-card-description">
            </div>
            <template #footer>
                <p>ID: {{ project.id }}</p>
                <p>version: {{ project.version }}</p>
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
    width: unset !important;

    p {
        margin: 0;
    }

    ::v-deep .n-card__footer {
        padding-top: 20px;
    }

    .n-button {
        width: 100%;
    }
}
</style>