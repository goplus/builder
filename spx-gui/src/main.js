
import { createApp } from 'vue'
import App from './App.vue'
import router from "@/router/index.js";
import {createStore} from "vuex";

const app = createApp(App);

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
