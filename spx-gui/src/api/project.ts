import type { ProjectDetail, ProjectInfo, SaveProjectParams } from "@/interface/library";
import type { ResponseData } from "@/axios";
import { service } from "@/axios"
import type { FormatResponse } from "@/components/code-editor";
import type { AxiosResponse } from "axios";
import qiniu from 'qiniu-js'
import { PublicStatus } from "@/class/project";

/**
 * Fetches a list of projects.
 * @param pageIndex The index of the page to retrieve in a paginated list.
 * @param pageSize The number of projects to retrieve per page.
 * @param isPublic Public projects or user projects.
 * @returns Project[]
 */
export async function getProjects(pageIndex: number, pageSize: number, isPublic?: PublicStatus, author?: string): Promise<PageData<Project[]>> {
    const baseUrl = `/projects/list`
    const params = new URLSearchParams()
    params.append('pageIndex', String(pageIndex))
    params.append('pageSize', String(pageSize))
    isPublic !== undefined && params.append('isPublic', String(isPublic))
    author && params.append('author', author)
    const url = `${baseUrl}?${params.toString()}`
    return service({ url: url, method: 'get' }).then((res) => res.data.data);
}

/**
 * Fetches a single project.
 * @param id The id of the project
 * @returns Project
 */
export async function getProject(id: string): Promise<ProjectDetail> {
    const url = `/project/${id}`;
    return service({ url: url, method: 'get' }).then((res) => res.data.data);
}

/**
 * Removes a project.
 * @param id The id of the project
 * @returns string
 */
export async function removeProject(id: string): Promise<string> {
    const url = `/project/${id}`;
    return service({ url: url, method: 'delete' }).then((res) => res.data.data);
}

/**
 * Update project isPublic status.
 * @param id project id that will be public
 * @returns
 */
export async function updateProjectIsPublic(id: string, status: PublicStatus): Promise<string> {
    const url =  `/project/${id}/is-public?isPublic=${status}`;
    return service({ url: url, method: 'put' }).then((res) => res.data.data);
}

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
