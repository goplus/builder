import type { ProjectDetail, ProjectInfo, SaveProjectParams } from "@/interface/library";
import type { ResponseData } from "@/axios";
import { service } from "@/axios"
import type { FormatResponse } from "@/components/code-editor";
import type { AxiosResponse } from "axios";
import qiniu from 'qiniu-js'

/**
 * Format spx code
 *
 * @param body The string content to be formatted.
 * @returns string
 */
export function formatSpxCode(body: string): Promise<AxiosResponse<ResponseData<FormatResponse>>> {
    const url = '/project/fmt';
    const formData = new FormData();
    formData.append('body', body);

    return service({
        url: url,
        method: 'post',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        },
    });
}

async function getUploadToken() {
    const response = await service.get('/project/upload-token')
    return response.data.data
}

export async function uploadFile(file: File) {
    const token = await getUploadToken()
    if (!token) {
        throw new Error('Unable to get upload token')
    }
    return new Promise((resolve, reject) => {

        const observable = qiniu.upload(file, null, token)
        observable.subscribe({
            next(res) {
                console.log('upload progress: ', res.total.percent)
            },
            error(err) {
                console.error('Upload failed:', err)
                reject(err)
            },
            complete(res) {
                const url = import.meta.env.VITE_KODO_ADDRESS + '/' + `${res.key}`
                resolve(url)
            }
        })
    })
}

export async function getProjectList(uid: string): Promise<ProjectInfo[]> {
    const response = await service.get(`/project/list/${uid}`)
    return response.data.data
}

export async function loadProject(id: string): Promise<ProjectDetail> {
    const response = await service.get(`/project/detail/${id}`)
    return response.data.data
}

export async function saveProject(params: SaveProjectParams): Promise<ProjectDetail> {
    const response = await service.post('/project/save', params)
    return response.data.data
}
