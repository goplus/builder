import { createRouter, createWebHistory } from "vue-router";

const routes = [
    { path: '/', redirect: '/spx/homepage' },
    {
        path: '/spx/homepage',
        name: 'SpxHomepage',
        component: () =>
            import("../components/SpxHomepage.vue"),
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
