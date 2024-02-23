import * as qiniu from 'qiniu-js'
import {service} from '@/axios'

interface ProjectInfo {
    id: string;
    name: string;
    version: number;
}

interface ProjectFiles {
    [key: string]: string;
}

interface ProjectDetail {
    authorId: string;
    createdAt: string;
    files: ProjectFiles;
    id: string;
    isPublic: number;
    name: string;
    status: number;
    updatedAt: string;
    version: number;
}

interface SaveProjectParams {
    id?: string;
    name: string;
    uid: string;
    isPublic: number;
    files: ProjectFiles;
}

async function getUploadToken() {
    try {
        const response = await service.get('/project/upload-token')
        return response.data.data
    } catch (error) {
        console.error(error)
        return null
    }
}

async function uploadFile(file: File) {
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

async function getProjectList(uid: string): Promise<ProjectInfo[]> {
    try {
        const response = await service.get(`/project/list/${uid}`)
        return response.data.data
    } catch (error) {
        console.error(error)
        return []
    }
}

async function loadProject(id: string): Promise<ProjectDetail> {
    try {
        const response = await service.get(`/project/detail/${id}`)
        return response.data.data
    } catch (error) {
        console.error(error)
        return <ProjectDetail>{}
    }
}

async function saveProject(params: SaveProjectParams): Promise<ProjectDetail> {
    try {
        const response = await service.post('/project/save', params)
        return response.data.data
    } catch (error) {
        console.error(error)
        return <ProjectDetail>{}
    }
}

export {uploadFile, getProjectList, loadProject, saveProject}

