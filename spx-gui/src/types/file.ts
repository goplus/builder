/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-04 16:44:29
 * @FilePath: /spx-gui/src/types/file.ts
 * @Description: The type of file.
 */

import type { Config } from '@/interface/file'

export interface FileType {
  content: ArrayBuffer
  path: string
  type: string
  size: number
  modifyTime: Date
}

export interface DirPath {
  [path: string]: FileType
}

export type RawFile = string | File | Config

export interface RawDir {
  [path: string]: RawFile
}
