import { ref, readonly, Ref } from 'vue'
import { defineStore } from 'pinia'
import Sound, { isSound } from '@/class/sound'

export const useSoundStore = defineStore('sound', () => {
    /**
     * All sounds in project.
     */
    const sounds: Ref<Sound[]> = ref([])

    /**
     * Set sounds in project.
     * @param {Sound[]} snds 
     * 
     * @example
     * setSound([new Sound('sound1', [])])
     * setSound([])    // You can also reset sounds by passing an empty array.
     */
    function setSound(snds: Sound[]) {
        if (snds.some(sound => !isSound(sound))) {
            throw new Error('All sounds must be an instance of Sound.')
        }
        sounds.value = snds
    }

    /**
     * Add sound to project.
     * @param {Sound[]} snds
     */
    function addSound(...snds: Sound[]) {
        if (snds.some(sound => !isSound(sound))) {
            throw new Error('All sounds must be an instance of Sound.')
        }
        if (snds.some(sound => isSoundExistByName(sound.name))) {
            throw new Error('All sounds must be unique.')
        }
        sounds.value.push(...snds)
    }

    /**
     * Remove sound from project by name.
     * @param {string} name 
     */
    function removeSoundByName(name: string) {
        const index = sounds.value.findIndex(sound => sound.name === name)
        index > -1 && sounds.value.splice(index, 1)
    }

    /**
     * Remove sound from project by reference.
     * @param {Sound} sound 
     */
    function removeSoundByRef(sound: Sound) {
        if (!isSound(sound)) {
            throw new Error('Sound must be an instance of Sound.')
        }
        const index = sounds.value.indexOf(sound)
        index > -1 && sounds.value.splice(index, 1)
    }

    /**
     * Get sound from project by name.
     * @param {string} name 
     * @returns {Sound}
     */
    function getSoundByName(name: string): Sound | null {
        const s = sounds.value.find(sound => sound.name === name) || null
        return s
    }

    /**
     * Check if sound exists in project by name.
     * @param {string} name
     * @param {Sound[]} array
     * @returns {boolean}
     */
    function isSoundExistByName(name: string, array: Sound[] = sounds.value): boolean {
        return array.some(sound => sound.name === name)
    }

    /**
     * Check if sound exists in project by reference.
     * @param {Sound} sound
     * @param {Sound[]} array
     * @returns {boolean}
     */
    function isSoundExistByRef(sound: Sound, array: Sound[] = sounds.value): boolean {
        if (!isSound(sound)) {
            throw new Error('Sound must be an instance of Sound.')
        }
        return array.some(s => s === sound)
    }

    return {
        setSound,
        addSound,
        removeSoundByName,
        removeSoundByRef,
        getSoundByName,
        isSoundExistByName,
        isSoundExistByRef,
        sounds: readonly(sounds),
    }

})
