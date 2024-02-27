/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-27 17:03:36
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-27 18:11:53
 * @FilePath: \builder\spx-gui\src\widgets\spx-runner\index.ts
 * @Description: 
 */
import { defineCustomElement } from "vue";
import spxRunner from "./spx-runner.vue";
export const spxRunnerWidget = defineCustomElement(spxRunner)

customElements.define("spx-runner", spxRunnerWidget)