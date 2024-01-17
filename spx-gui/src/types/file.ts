import Sprite from "@/class/sprite"
import Sound from "@/class/sound"
import Backdrop from "@/class/backdrop"

export type projectType = {
    title: string,
    sprites: Sprite[],
    sounds: Sound[],
    backdrop: Backdrop,
    defaultDir: dirPath
}

export type FileType = {
    content: ArrayBuffer,
    path: string,
    type: string,
    size: number,
    modifyTime: Date
}

export type dirPath = Record<string, FileType>