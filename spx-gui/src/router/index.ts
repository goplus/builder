/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 09:16:35
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-15 10:14:39
 * @FilePath: /builder/spx-gui/src/router/index.ts
 * @Description: 
 */
import { App } from "vue";
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
  { path: "/", redirect: "/spx/home" },
  {
    path: "/spx/home",
    name: "SpxHome",
    component: () => import("../view/HomeView.vue"),
  },
  {
    path: "/sprite/list",
    name: "SpriteList",
    component: () => import("../components/sprite-list/SpriteList.vue"),
  },
  {
    path: '/editor/homepage',
    name: 'EditorHomepage',
    component: () => import("../view/EditorHomepage.vue"),
  }
];

const router = createRouter({
  history: createWebHistory(""),
  routes,
});

export const initRouter = async (app:App) => {
  app.use(router)
  // This is an example of a routing result that needs to be loaded.
  await new Promise(resolve => {
      setTimeout(() => {
          resolve(true)
      }, 1000);
  })
}

