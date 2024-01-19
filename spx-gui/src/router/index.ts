/*
 * @Author: Xu Ning
 * @Date: 2024-01-15 14:38:44
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-17 23:23:10
 * @FilePath: /builder/spx-gui/src/router/index.ts
 * @Description: 
 */
import { App } from "vue";
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";

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

