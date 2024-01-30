/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:53:46
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-30 10:56:05
 * @FilePath: /builder/spx-gui/src/store/modules/editor/index.ts
 * @Description: 
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import { monaco } from "@/plugins/code-editor";
import { event_fn_completions, look_fn_completions, motion_fn_completions, sound_fn_completions, control_fn_completions } from "@/plugins/code-editor/config";

export type ToolboxItem = {
    label: string,
    completionItems: monaco.languages.CompletionItem[]
}
export type Toolbox = ToolboxItem[];

export const useEditorStore = defineStore('editor', () => {
    /**
     * toolbox list rely the monaco.languages.CompletionItem
     */
    let completionToolbox = ref<Toolbox>([
        {
            label: 'Event',
            completionItems: event_fn_completions
        },
        {
            label: 'Look',
            completionItems: look_fn_completions
        }, {
            label: "Motion",
            completionItems: motion_fn_completions
        }, {
            label: "Sound",
            completionItems: sound_fn_completions
        }, {
            label: "Control",
            completionItems: control_fn_completions
        }
    ]);
    
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
        completionToolbox,
        insertSnippet,
    }
})