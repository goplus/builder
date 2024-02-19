/*
 * @Author: Yao Xinyue
 * @Date: 2024-01-22 11:17:08
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-06 20:18:02
 * @FilePath: /builder/spx-gui/src/axios/index.ts
 * @Description:
 */
import { createDiscreteApi } from 'naive-ui'
import axios, { type AxiosResponse } from 'axios'
import { useTokenStore } from '@/store'

const baseURL = 'http://116.62.66.126:8080'

const service = axios.create({
  baseURL: baseURL,
  timeout: 15000
})

const { message } = createDiscreteApi(['message'])

export interface ResponseData<T> {
  code: number
  data: T
  msg: string
}

service.interceptors.request.use(
  async (config) => {
    const tokenStore = useTokenStore()

    const token = await tokenStore.getFreshAccessToken()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    message.error(error.message)
    return Promise.reject(error)
  }
)

//  response interceptor
service.interceptors.response.use(
  (response: AxiosResponse<ResponseData<unknown>>) => {
    if (response.data.code >= 200 && response.data.code < 300) {
      return response
    } else {
      message.error(response.data.msg)
      return Promise.reject(new Error(response.data.msg || 'Error'))
    }
  },
  (error) => {
    message.error(error.message)
    return Promise.reject(error)
  }
)
export { service, baseURL }
