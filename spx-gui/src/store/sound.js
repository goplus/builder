import { ref, readonly } from 'vue'
import { defineStore } from 'pinia'
import Sound, { isSound } from '@/class/sound'

export const useSoundStore = defineStore('sound', () => {
    /**
     * All sounds in project.
     */
    const sounds = ref([])

    /**
     * Set sounds in project.
     * @param {Sound[]} snds 
     * 
     * @example
     * setSound([new Sound('sound1', [])])
     * setSound([])    // You can also reset sounds by passing an empty array.
     */
    function setSound(snds) {
        if (snds.some(sound => !isSound(sound))) {
            throw new Error('All sounds must be an instance of Sound.')
        }
        sounds.value = snds
    }

    /**
     * Add sound to project.
     * @param {Sound} snds
     */
    function addSound(...snds) {
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
    function removeSoundByName(name) {
        sounds.value = sounds.value.filter(sound => sound.name !== name)
    }

    /**
     * Remove sound from project by reference.
     * @param {Sound} sound 
     */
    function removeSoundByRef(sound) {
        if (!isSound(sound)) {
            throw new Error('Sound must be an instance of Sound.')
        }
        sounds.value = sounds.value.filter(s => s !== sound)
    }

    /**
     * Get sound from project by name.
     * @param {string} name 
     * @returns {Sound}
     */
    function getSoundByName(name) {
        const s = sounds.value.find(sound => sound.name === name) || null
        return readonly(s)
    }

    /**
     * Check if sound exists in project by name.
     * @param {string} name
     * @param {Sound[]} array
     * @returns {boolean}
     */
    function isSoundExistByName(name, array = sounds.value) {
        return array.some(sound => sound.name === name)
    }

    /**
     * Check if sound exists in project by reference.
     * @param {Sound} sound
     * @param {Sound[]} array
     * @returns {boolean}
     */
    function isSoundExistByRef(sound, array = sounds.value) {
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
