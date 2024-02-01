/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-24 08:53:12
 * @FilePath: \builder\spx-gui\src\types\file.ts
 * @Description: The type of file.
 */

import Sprite from "@/class/sprite"
import Sound from "@/class/sound"
import Backdrop from "@/class/backdrop"
import { Config } from "@/interface/file"

export type codeType = {
    path: string,
    content: string
}

export interface projectType {
    title: string,
    sprites: Sprite[],
    sounds: Sound[],
    backdrop: Backdrop,
    defaultDir: dirPath,
    code: codeType
}

export interface FileType {
    content: ArrayBuffer,
    path: string,
    type: string,
    size: number,
    modifyTime: Date
}

export interface dirPath {
    [path: string]: FileType
}

export type rawFile = string | File | Config

export interface rawDir {
    [path: string]: rawFile
}

export interface directory {
    [path: string]: File
}