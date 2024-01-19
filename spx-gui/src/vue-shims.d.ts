/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 21:20:42
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-12 21:20:49
 * @FilePath: /builder/spx-gui/vue-shims.d.ts
 * @Description: 
 */
declare module '*.vue' {
    import { DefineComponent } from 'vue';
    const component: DefineComponent<{}, {}, any>;
    export default component;
  }
  