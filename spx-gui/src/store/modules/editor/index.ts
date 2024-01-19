/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:53:46
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-19 16:21:16
 * @FilePath: /builder/spx-gui/src/store/modules/editor/index.ts
 * @Description: 
 */
import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";
import { monaco } from "@/plugins/code-editor";
import { event_fn_completions } from "@/plugins/code-editor/config";
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
        }, {
            id: "Arrow",
            code: `onStart =>{\n\t\n}`
        }
    ]);
    let toolbox = ref<monaco.languages.CompletionItem[]>(event_fn_completions);

    // TODO temerary solution,wait migrate with sprite store
    const setCurrent = (id: string) => {
        current.value = id
    }
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


    /**
     * @description: trigger the insertion function
     * The code editor component is subscribed the event
     * @param {monaco.languages.CompletionItem} snippet
     * @return {*}
     * @author Zhang zhi yang
     */
    const insertSnippet = (snippet: monaco.languages.CompletionItem) => {
    }


    return {
        current,
        spx_list,
        toolbox,
        insertSnippet,
        setCurrent,
        getCurrentSpxCode,
        setCurrentSpxCode
    }
})