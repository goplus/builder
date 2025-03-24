import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ref } from 'vue';

const transportPair = InMemoryTransport.createLinkedPair();
export const clientTransport: InMemoryTransport = transportPair[0];
export const serverTransport: InMemoryTransport = transportPair[1];

// 创建一个对象存储客户端和服务器连接状态
export const mcpConnectionStatus = {
  client: ref(false),
  server: ref(false),
};

// 监听状态变化
export function setClientConnected(status: boolean) {
  mcpConnectionStatus.client.value = status;
}

export function setServerConnected(status: boolean) {
  mcpConnectionStatus.server.value = status;
}