import type { PageData, Project } from "@/interface/library";
import { service } from "@/axios"
import type { ResponseData } from "@/axios";
import type { FormatResponse } from "@/components/code-editor";
import type { AxiosResponse } from "axios";
import { PublicStatus } from "@/class/project";

/**
 * Saves a project.
 *
 * @param name The name of the project.
 * @param file The code file(zip) to be uploaded.
 * @param id
 * @returns Project
 */
export async function saveProject(name: string, file: File, id?: string): Promise<Project> {
    const url = '/project';
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);
    id && formData.append('id', id);

    const res: AxiosResponse<ResponseData<Project>> = await service({
        url: url,
        method: 'post',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        },
    })
    if (res.data.code >= 200 && res.data.code < 300) {
        return res.data.data
    } else {
        throw new Error(res.data.msg)
    }
}

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
export async function getProject(id: string): Promise<Project> {
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
  const url = '/util/fmt'
  const formData = new FormData()
  formData.append('body', body)

  return service({
    url: url,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}