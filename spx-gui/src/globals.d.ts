/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 14:19:31
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-31 17:38:25
 * @FilePath: /builder/spx-gui/src/globals.d.ts
 * @Description: 
 */
import { FormatResponse } from "./components/code-editor/CodeEditor";
interface Window {
  // Required to communicate with Go WASM.
  project_path: string;
}

/**
 * Formatter function in Go WASM.
 * @param input
 */
declare function formatSPX(input: string): FormatResponse;
