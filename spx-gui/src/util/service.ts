import { service } from '@/axios'
import { useUserStore } from '@/store'
import { createDiscreteApi } from 'naive-ui'

const { message } = createDiscreteApi(['message'])
export const initServive = async () => {
  const userStore = useUserStore()
  service.setAccessTokenFn(userStore.getFreshAccessToken)
  service.setNotifyErrorFn((msg:string) => {
    message.error(msg)
  })
}
