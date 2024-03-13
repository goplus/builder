import type { AssetBase } from "@/class/asset-base"
import type { Project } from "@/class/project"
import { keywords, typeKeywords } from "@/components/code-editor/language"

interface checkInfo {
    name: string
    isChanged: boolean
    msg: string | null
}

export const isValidAssetName = (name: string) => {
    // spx code is go+ code, and the asset name will compiled to an identifier of go+
    // so asset name rules is depend on the identifier rules of go+.
    const regex = /^[\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_]*$/
    return regex.test(name) && !typeKeywords.includes(name) && !keywords.includes(name)
}

export function checkUpdatedName<T extends AssetBase>(obj: T, name: string, project: Project): checkInfo {
    if (!isValidAssetName(name)) throw new Error('Cannot update asset name. Name is invalid! ')
    const originName = obj.name
    if (originName === name) return {
        name,
        isChanged: false,
        msg: null
    }
    const assetList = [...project.sprite.list, ...project.sound.list]
    let counter = 1
    let changedName = name
    while (assetList.find(item => item.name === changedName)) {
        counter++
        changedName = `${name}_${counter}`
    }
    if (changedName !== name) return {
        name: changedName,
        isChanged: true,
        msg: `Name must be unique! ${name} already exist. It will be renamed to ${changedName}.`
    }
    return {
        name: changedName,
        isChanged: true,
        msg: null
    }
}