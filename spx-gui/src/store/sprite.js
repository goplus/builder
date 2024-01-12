import { ref } from "vue"
import { defineStore } from "pinia"
import Sprite, { isSprite } from "@/class/sprite"


export const useSpriteStore = defineStore('sprite', () => {
    /**
     * All sprites in project.
     */
    const sprites = ref([])

    /**
     * Set sprites in project.
     * @param {Sprite[]} sps 
     * 
     * @example
     * setSprite([new Sprite('sound1', [])])
     * setSprite([])    // You can also reset sprites by passing an empty array.
     */
    function setSprite(sps) {
        if (sps.some(sprite => !isSprite(sprite))) {
            throw new Error('All sprites must be an instance of Sprite.')
        }
        sprites.value = sps
    }

    /**
     * Add sprite to project.
     * @param {Sprite} sps 
     */
    function addSprite(...sps) {
        if (sps.some(sprite => !isSprite(sprite))) {
            throw new Error('All sprites must be an instance of Sprite.')
        }
        if (sps.some(sprite => isSpriteExistByName(sprite.name))) {
            throw new Error('All sprites must be unique.')
        }
        sprites.value.push(...sps)
    }

    /**
     * Remove sprite from project by name.
     * @param {string} name 
     */
    function removeSpriteByName(name) {
        const index = sprites.value.findIndex(sprite => sprite.name === name)
        sprites.value.splice(index, 1)
    }

    /**
     * Remove sprite from project by reference.
     * @param {Sprite} sprite 
     */
    function removeSpriteByRef(sprite) {
        if (!isSprite(sprite)) {
            throw new Error('Sprite must be an instance of Sprite.')
        }
        const index = sprites.value.indexOf(sprite)
        index > -1 && sprites.value.splice(index, 1)
    }

    /**
     * Check if sprite exists in project by name.
     * @param {string} name
     * @param {Sprite[]} array
     * @returns {boolean}
     */
    function isSpriteExistByName(name, array = sprites.value) {
        return array.some(sprite => sprite.name === name)
    }

    /**
     * Check if sprite exists in project by reference.
     * @param {Sprite} sprite
     * @param {Sprite[]} array
     * @returns {boolean}
     */
    function isSpriteExistByRef(sprite, array = sprites.value) {
        if (!isSprite(sprite)) {
            throw new Error('Sprite must be an instance of Sprite.')
        }
        return array.some(s => s === sprite)
    }

    /**
     * Get sprite from project by name.
     * @param {string} name
     */
    function getSpriteByName(name) {
        const s = sprites.value.find(sprite => sprite.name === name) || null
        return s
    }

    return {
        setSprite,
        addSprite,
        removeSpriteByName,
        removeSpriteByRef,
        getSpriteByName,
        isSpriteExistByName,
        isSpriteExistByRef,
        sprites,
    }
})
