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

export default router;
