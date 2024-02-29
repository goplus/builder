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
export function saveProject(name: string, file: File, id?: string): Promise<AxiosResponse<ResponseData<Project>>> {
    const url = '/project/allsave';
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);
    id && formData.append('id', id);

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
 * Fetches a list of projects.
 * @param pageIndex The index of the page to retrieve in a paginated list.
 * @param pageSize The number of projects to retrieve per page.
 * @param isPublic Whether the project is public
 * @returns Project[]
 */
export function getProjects(pageIndex: number, pageSize: number, isUser: boolean): Promise<AxiosResponse<ResponseData<PageData<Project[]>>>> {
    const url = isUser ? `/list/userProject/${pageIndex}/${pageSize}` : `/list/pubProject/${pageIndex}/${pageSize}`;
    return service({ url: url, method: 'get' });
}

/**
 * Fetches a single project.
 * @param id The id of the project
 * @returns Project
 */
export function getProject(id: string): Promise<AxiosResponse<ResponseData<Project>>> {
    const url = `/project?id=${id}`;
    return service({ url: url, method: 'get' });
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
