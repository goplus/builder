/*
 * @Author: Yao Xinyue
 * @Date: 2024-01-22 11:17:08
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-23 14:27:36
 * @FilePath: /builder/spx-gui/src/axios/index.ts
 * @Description: 
 */
import { createDiscreteApi } from "naive-ui";
import axios, {AxiosResponse} from "axios";

const baseURL = 'http://127.0.0.1:8080';

const service = axios.create({
  baseURL: baseURL,
  timeout: 15000,
});

const { message } = createDiscreteApi(["message"]);

interface ResponseData<T> {
  code: number;
  data: T;
  msg: string;
}

//  response interceptor
service.interceptors.response.use((response: AxiosResponse<ResponseData<any>>) => {
  console.log(response.data);
  if (response.data.code === 200) {
    return response.data.data;
  } else {
    message.error(response.data.msg);
    return Promise.reject();
  }
});
export { service, baseURL };
