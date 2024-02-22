import * as qiniu from 'qiniu-js'
import * as crypto from 'crypto'
import { service } from '@/axios'

function calculateMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function(_e) {
      const data = _e.target?.result as ArrayBuffer
      if (!data) {
        reject(new Error('File data is null'))
        return
      }
      const hash = crypto.createHash('md5')
      hash.update(new Uint8Array(data))
      resolve(hash.digest('hex'))
    }
    reader.onerror = function() {
      reject(new Error('Failed to read file'))
    }
    reader.readAsArrayBuffer(file)
  })
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
  const md5 = await calculateMD5(file)
  const extension = file.name.split('.').pop()
  const key = `${md5}.${extension}`
  const url = import.meta.env.VITE_KODO_ADDRESS + '/' + key
  return new Promise((resolve, reject) => {

    const observable = qiniu.upload(file, key, token)
    observable.subscribe({
      next(res) {
        console.log('upload progress: ', res.total.percent)
      },
      error(err) {
        reject(err)
      },
      complete() {
        resolve(url)
      }
    })
  })
}

export { uploadFile }
