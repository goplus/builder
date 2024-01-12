import { createRouter, createWebHistory } from "vue-router";

const routes: any = [
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
];

const router = createRouter({
  history: createWebHistory(""),
  routes,
});

export default router;
