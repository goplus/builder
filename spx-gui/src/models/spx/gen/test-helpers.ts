import { vi } from 'vitest'
import * as cloud from '@/models/common/cloud'

export function mockSaveFile() {
  cloud.cloudHelpers.setConfig({
    baseUrl: 'https://bucket.example.com',
    bucket: 'mock-bucket'
  })
  return vi.spyOn(cloud, 'saveFile').mockImplementation(async (file) => {
    return `kodo://mock-bucket/${file.name}`
  })
}
