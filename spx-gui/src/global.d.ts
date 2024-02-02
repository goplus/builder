/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-24 01:40:40
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-02 14:53:43
 * @FilePath: /spx-gui/src/global.d.ts
 * @Description: The global declaration.
 */
import { FormatResponse } from "./components/code-editor/CodeEditor";
/**
 * Add global declaration for File with url property.
 */
declare global {
    interface File {
        url: string;
    }
    
    /**
     * @description: format spx code power by gopfmt's wasm
     * @param {string} spx-code
     * @return {*}
     * @Author: Zhang Zhi Yang
     * @Date: 2024-02-02 14:54:14
     */
    function formatSPX(input: string): FormatResponse;
}

export { File, formatSPX }