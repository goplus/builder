import type { PageData, Project } from "@/interface/library";
import { service } from "@/axios"
import type { ResponseData } from "@/axios";
import type { FormatResponse } from "@/components/code-editor";
import type { AxiosResponse } from "axios";

/**
 * Saves a project.
 *
 * @param name The name of the project.
 * @param uid The user ID of the author.
 * @param file The code file(zip) to be uploaded.
 * @returns Project
 */
export async function saveProject(name: string, file: File, id?: string): Promise<Project> {
    const url = '/project/allsave';
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
 * @param isPublic Whether the project is public
 * @returns Project[]
 */
export async function getProjects(pageIndex: number, pageSize: number, isUser: boolean): Promise<PageData<Project[]>> {
    const url = isUser ? `/list/userProject/${pageIndex}/${pageSize}` : `/list/pubProject/${pageIndex}/${pageSize}`;
    return service({ url: url, method: 'get' }).then((res) => res.data.data);
}

/**
 * Fetches a single project.
 * @param id The id of the project
 * @returns Project
 */
export async function getProject(id: string): Promise<Project> {
    const url = `/project?id=${id}`;
    return service({ url: url, method: 'get' }).then((res) => res.data.data);
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

/**
 * Update project status to public.
 * @param id project id that will be public
 * @returns
 */
export async function publicProject(id: number): Promise<void> {
    const url =  `/project/updateIsPublic/${id}`;
    service({ url: url, method: 'get' }).then((res) => res.data.code);
}
