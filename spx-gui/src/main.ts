/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-12 21:48:00
 * @FilePath: /builder/spx-gui/src/main.ts
 * @Description:
 */

import { createApp } from "vue";
import { createStore } from "vuex";
import { createPinia } from "pinia";
import App from "./App.vue";
import piniaPluginPersist from "pinia-plugin-persist";
import router from "@/router/index.ts";
import "vfonts/Lato.css";
import "vfonts/FiraCode.css";

const pinia = createPinia();
pinia.use(piniaPluginPersist);
const app = createApp(App);

app.use(pinia);
app.use(router).mount("#app");

// vuex store
const store = createStore({
  state() {
    return {
      count: 0,
    };
  },
  mutations: {
    increment(state) {
      state.count++;
    },
  },
});

app.use(store);
