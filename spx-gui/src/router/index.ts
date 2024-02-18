/*
 * @Author: Xu Ning
 * @Date: 2024-01-15 09:16:35
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-05 16:42:18
 * @FilePath: /spx-gui/src/router/index.ts
 * @Description:
 */
import type { App } from "vue";
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
    { path: '/', redirect: '/editor/homepage' },
    {
        path: '/spx/home',
        name: 'SpxHome',
        component: () =>
            import("@/view/HomeView.vue"),
    },
    {
        path: '/sprite/list',
        name: 'SpriteList',
        component: () =>
            import("../components/sprite-list/SpriteList.vue"),
    },
    {
        path:"/code/editor",
        name:'codeeditor',
        component:()=>
            import("../components/code-editor-demo/CodeEditorDemo.vue"),
    },
    {
        path:"/stage/viewer",
        name:'StageViewer',
        component:()=>
            import("../components/stage-viewer-demo/StageViewerDemo.vue"),
    },
    {
        path: '/editor/homepage',
        name: 'EditorHomepage',
        component: () =>
            import("../view/EditorHomepage.vue"),
    }
];


const router = createRouter({
    history: createWebHistory(''),
    routes,
});

export const initRouter = async (app:App) => {
  app.use(router)
  // This is an example of a routing result that needs to be loaded.
  await new Promise(resolve => {
      setTimeout(() => {
          resolve(true)
      }, 0);
  })
}

