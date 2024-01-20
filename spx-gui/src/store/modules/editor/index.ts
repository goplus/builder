/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:53:46
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-20 14:17:17
 * @FilePath: /builder/spx-gui/src/store/modules/editor/index.ts
 * @Description: 
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import { monaco } from "@/plugins/code-editor";
import { event_fn_completions } from "@/plugins/code-editor/config";

export const useEditorStore = defineStore('editor', () => {
    let toolbox = ref<monaco.languages.CompletionItem[]>(event_fn_completions);
    /**
     * @description: trigger the insertion function
     * The code editor component is subscribed the event
     * @param {monaco.languages.CompletionItem} snippet
     * @return {*}
     * @author Zhang zhi yang
     */
    const insertSnippet = (snippet: monaco.languages.CompletionItem) => {
        // This function is notify code-editor component's insert Function
    }


    return {
        toolbox,
        insertSnippet,
    }
})