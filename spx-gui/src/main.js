
import { createApp } from 'vue'
import {createStore} from "vuex";
import { createPinia } from 'pinia'
import App from './App.vue'
import router from "@/router/index.js";
import 'vfonts/Lato.css'
import 'vfonts/FiraCode.css'



const pinia = createPinia()
const app = createApp(App);

app.use(pinia);
app.use(router).mount('#app');



// vuex store
const store = createStore({
    state () {
        return {
            count: 0
        }
    },
    mutations: {
        increment (state) {
            state.count++
        }
    }
})

app.use(store)
