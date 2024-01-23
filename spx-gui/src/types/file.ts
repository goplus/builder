import Sprite from "@/class/sprite"
import Sound from "@/class/sound"
import Backdrop from "@/class/backdrop"

export type codeType = {
    path: string,
    content: string
}

export type projectType = {
    title: string,
    sprites: Sprite[],
    sounds: Sound[],
    backdrop: Backdrop,
    defaultDir: dirPath,
    code: codeType
}

export type FileType = {
    content: ArrayBuffer,
    path: string,
    type: string,
    size: number,
    modifyTime: Date
}

export type dirPath = Record<string, FileType>

export type rawFile = string | File | Record<string, any> | FileType

export type rawDir = Record<string, rawFile>