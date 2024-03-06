/*
 * @Author: Yao Xinyue
 * @Date: 2024-01-22 11:17:08
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-06 12:19:14
 * @FilePath: \spx-gui\src\axios\index.ts
 * @Description:
 */
import { createDiscreteApi } from 'naive-ui'
import axios, { type AxiosResponse, type AxiosInstance } from 'axios'
const baseURL = import.meta.env.VITE_API_BASE_URL

const { message } = createDiscreteApi(['message'])

export interface ResponseData<T> {
  code: number
  data: T
  msg: string
}

class Service {
  accessTokenFn: (() => Promise<string | null>) | null = null
  serviceInstance: AxiosInstance
  constructor() {
    this.serviceInstance = this.initAxios()
  }
  private initAxios() {
    const service = axios.create({
      baseURL: baseURL,
      timeout: 15000
    })
    service.interceptors.request.use(
      async (config) => {
        if (this.accessTokenFn) {
          const token = await this.accessTokenFn()
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`
          }
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
    return service
  }
  setAccessTokenFn(accessTokenFn: () => Promise<string | null>) {
    this.accessTokenFn = accessTokenFn
  }
}

const service = new Service()
export { service, baseURL }
