<template>
    <h1>{{ project.title }}</h1>
    <h2>Local Project</h2>
    <button @click="getLocals">getLocals</button>
    <button @click="project.load(item)" v-for="item in locals">{{ item }}</button>

    <input type="file" @change="add" accept=".zip">
    <button @click="project.saveToComputer">saveToComputer</button>
    <h2>EntryCode</h2>
    <p v-text="project.entryCode"></p>
    <h2>Sprites</h2>
    <p v-for="item in project.sprite.list" :key="item.name">
        <b>{{ item.name }}</b>
        {{ item }}
        <button @click="item.name += '!'">addName!</button>
    </p>
</template>

<script setup lang="ts">
import { useProjectStore } from "@/store/modules/project";
import { storeToRefs } from "pinia";
import { ref } from "vue";
const projectStore = useProjectStore();
const { project } = storeToRefs(projectStore);
const add = (e: any) => {
    project.value.load(e.target.files[0])
}
const locals = ref<string[]>([])
const getLocals = async () => {
    locals.value = await projectStore.getLocalProject()
}
</script>