/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-27 17:03:36
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-09 14:41:05
 * @FilePath: \builder\spx-gui\src\widgets\widget\spx-runner\index.ts
 * @Description: 
 */
import { defineCustomElement } from "vue";
import spxRunner from "./SpxRunner.ce.vue";
const spxRunnerWidget = defineCustomElement(spxRunner)
customElements.define("spx-runner", spxRunnerWidget)