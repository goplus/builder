import * as qiniu from 'qiniu-js'
import {service} from '@/axios'

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

export {uploadFile}