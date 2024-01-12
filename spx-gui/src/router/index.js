import { createRouter, createWebHistory } from "vue-router";

const routes = [
    { path: '/', redirect: '/spx/home' },
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
];

const router = createRouter({
    history: createWebHistory(''),
    routes,
});

export default router;
