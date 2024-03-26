/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-24 01:40:40
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-02 14:53:43
 * @FilePath: /spx-gui/src/global.d.ts
 * @Description: The global declaration.
 */
import { FormatResponse } from './components/code-editor'

declare global {
  /**
   * @description: format spx code power by gopfmt's wasm
   * @param {string} spx-code
   * @return {*}
   * @Author: Zhang Zhi Yang
   * @Date: 2024-02-02 14:54:14
   */
  function formatSPX(input: string): FormatResponse

  class Go {
    argv: string[]
    env: { [envKey: string]: string }
    exit: (code: number) => void
    importObject: WebAssembly.Imports
    exited: boolean
    mem: DataView
    run(instance: WebAssembly.Instance): Promise<void>
  }

  interface Window {
    /**
     * Required to communicate with Go WASM instance.
     */
    project_path: string
  }
}

export { File, formatSPX }
