import type { Project } from "@/interface/library";
import { service,ResponseData } from "@/axios";
import { FormatResponse } from "@/components/code-editor/CodeEditor";
import { AxiosResponse } from "axios";

/**
 * Saves a project.
 *
 * @param name The name of the project.
 * @param uid The user ID of the author.
 * @param file The code file(zip) to be uploaded.
 * @returns Project
 */
export function saveProject(name: string, uid: number, file: File): Promise<Project> {
    const url = '/project/save';
    const formData = new FormData();
    formData.append('name', name);
    formData.append('uid', uid.toString());
    formData.append('file', file);

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
