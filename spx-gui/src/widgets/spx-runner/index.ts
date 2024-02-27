/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-27 17:03:36
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-27 17:08:54
 * @FilePath: \builder\spx-gui\src\widgets\spx-runner\index.ts
 * @Description: 
 */
import { defineCustomElement } from "vue";
import runnerWidgetVue from "./runnerWidget.vue";
export const RunnerWidget = defineCustomElement(runnerWidgetVue)

customElements.define("runner-widget", RunnerWidget)