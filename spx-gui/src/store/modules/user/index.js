import { defineStore } from "pinia"
import { ref, computed, readonly } from "vue"
// The returned value of `defineStore () `is named using the name of store 
// This value needs to start with `use` and end with `Store`.
// (for example, `useAssetStore`, `useUserStore`, `useStyleStore`)

// The first parameter is the unique ID of the Store in the application
export const useUserStore = defineStore(
    'user',
    () => {
        // ----------state------------------------------------
        const token = ref("");
        const username = ref("");

        // ----------getters------------------------------------
        const getFullToken = computed(() => "Bear " + token.value)

        // ----------actions------------------------------------
        const setToken = (_token) => {
            token.value = _token
        }
        return {
        //  state
            username:readonly(username),
            token: readonly(token),
        //  getters
            getFullToken,
        //  actions
            setToken
        }
    }
)

