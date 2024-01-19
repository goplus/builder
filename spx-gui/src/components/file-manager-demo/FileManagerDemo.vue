<template>
    <h1>ProjectTitle:{{ title }}</h1>
    <h2>Load Zip</h2>
    <input type="file" name="" id="" @change="getZip" accept=".zip">

    <h2>Save Zip to Computer</h2>
    <button type="button" @click="saveToComputerByProject(void 0)">save</button>

    <h2>Add Sprite</h2>
    <label for="name">SpriteName: </label>
    <input type="text" name="name" id="name" v-model="spriteName">
    <br>
    <label for="file">files: </label>
    <input type="file" name="file" id="file" ref="file" accept="image/*" multiple>
    <br>
    <label for="code">code: </label>
    <textarea name="code" id="code" cols="30" rows="10" v-model="code"></textarea>
    <br>
    <button @click="addASprite">addSprite</button>

    <h2>Project</h2>
    <div v-for="sprite in project.sprites" :key="sprite.name">
        <h3>Sprite/{{ sprite.name }}</h3>
        <p>code: {{ sprite.code }}</p>
        <button @click="sprite.name += '!'">name + !</button>
        <button @click="spriteStore.removeItemByRef(sprite)">remove</button>
        <img :src="file2URL(img)" v-for="img in sprite.files" alt="" :key="img.name">
    </div>

    <div v-for="sound in project.sounds" :key="sound.name">
        <h3>Sound/{{ sound.name }}</h3>
        <audio :src="file2URL(audio)" v-for="audio in sound.files" controls :key="audio.name"></audio>
    </div>

    <div v-if="project.backdrop.files">
        <h3>Backdrop</h3>
        <img :src="file2URL(img)" v-for="img in project.backdrop.files" :key="img.name" alt="">
    </div>
</template>


<script setup lang="ts">
import Sprite from "@/class/sprite";
import { ref } from "vue";
import { useProjectStore } from '@/store/modules/project'
import { useSpriteStore } from "@/store/modules/sprite";
import { storeToRefs } from "pinia";

const { getDirPathFromZip, loadProject, saveToComputerByProject, saveByProject, watchProjectChange, getAllLocalProjects, getDirPathFromLocal } = useProjectStore()
const { project, title } = storeToRefs(useProjectStore())
const spriteStore = useSpriteStore()
const spriteName = ref("")
const code = ref("")
const file: any = ref(null)

async function getZip(e: any) {
    const dir = await getDirPathFromZip(e.target.files[0])
    loadProject(dir)
}

function addASprite() {
    const sprite = new Sprite(spriteName.value, Array.from(file.value.files), code.value)
    spriteStore.addItem(sprite)
    console.log(sprite);

    spriteName.value = ""
    code.value = ""
    file.value.value = null
}

watchProjectChange(() => {
    console.log('project changed');
    saveByProject()
})

// the window will shake because of the change of the URL
// use this to avoid
const map = new Map()
const file2URL = (file: File) => {
    if (!map.has(file.name)) {
        map.set(file.name, URL.createObjectURL(file))
    }
    return map.get(file.name)
}

async function init() {
    const projects = await getAllLocalProjects()
    const dir = await getDirPathFromLocal(projects[0])
    dir && loadProject(dir)
}
init()

</script>


<style scoped>
img {
    max-width: 100%;
}
</style>