import { defineStore } from 'pinia';
import { ref } from "vue";

export enum NetworkStatus {
    online,
    offline,
}

export const useNetworkStore = defineStore('network', () => {
    const networkStatus = ref<NetworkStatus>(NetworkStatus.online)

    const offline = () => networkStatus.value == NetworkStatus.offline

    const handleNetworkChange = () => {
        networkStatus.value = navigator.onLine
            ? NetworkStatus.online
            : NetworkStatus.offline;
        console.log('network status change: ', networkStatus.value)
    }

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return {
        networkStatus,
        offline,
    }
});