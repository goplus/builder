/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:53:46
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-02 11:05:30
 * @FilePath: /builder/spx-gui/src/store/modules/editor/index.ts
 * @Description: 
 */
import { defineStore } from "pinia";
import { monaco } from "@/components/code-editor";

export const useEditorStore = defineStore('editor', () => {
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
        insertSnippet,
    }
})
