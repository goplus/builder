/*
 * @Author: Xu Ning
 * @Date: 2024-01-15 14:38:44
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-01-17 18:13:31
 * @FilePath: /spx-gui-front-private/src/router/index.ts
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
        path: '/spirte/list',
        name: 'SpirteList',
        component: () =>
            import("../components/spirte-list/SpriteList.vue"),
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
        }, 1000);
    })
  }
  