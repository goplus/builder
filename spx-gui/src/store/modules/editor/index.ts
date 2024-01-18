/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:53:46
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-18 08:52:36
 * @FilePath: /builder/spx-gui/src/store/modules/editor/index.ts
 * @Description: 
 */
import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";

type spx = {
    id: string
    code: string
}

export const useEditorStore = defineStore('editor', () => {
    let current = ref("Calf");
    let spx_list = ref<spx[]>([
        {
            id: "Calf",
            code: 
`var (
    id int
)

onClick => {
    clone
}

onCloned => {
    gid++
    id = gid
    step 10
    say id, 0.5
}

onMsg "undo", => {
    if id == gid {
        destroy
    }
}
`
        },{
            id:"Arrow",
            code: `onStart =>{\n\t\n}`
        }
    ]);
    const getCurrentSpxCode = () => {
        return spx_list.value.find((item) => item.id === current.value)?.code || "";
    }
    const setCurrentSpxCode = (code: string) => {
        spx_list.value.forEach((item) => {
            if (item.id === current.value) {
                item.code = code
            }
        })
    }
    const setCurrent = (id: string) => {
        current.value = id
    }
    // const

    return {
        current,
        spx_list,
        setCurrent,
        getCurrentSpxCode,
        setCurrentSpxCode
    }
})