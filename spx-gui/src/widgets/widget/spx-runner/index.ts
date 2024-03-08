/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-27 17:03:36
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-05 22:16:31
 * @FilePath: \builder\spx-gui\src\widgets\spx-runner\index.ts
 * @Description: 
 */
import { defineCustomElement } from "vue";
import spxRunner from "./SpxRunner.ce.vue";
export const spxRunnerWidget = defineCustomElement(spxRunner)

customElements.define("spx-runner", spxRunnerWidget)