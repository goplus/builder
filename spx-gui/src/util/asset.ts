import type { Project } from "@/class/project"
import { keywords, typeKeywords } from "@/components/code-editor/language"
import { useProjectStore } from "@/store"

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

export function checkUpdatedName(originalName: string, name: string, project: Project = useProjectStore().project): checkInfo {
    if (!isValidAssetName(name)) throw new Error('Cannot update asset name. Name is invalid! ')

    const assetList = [...project.sprite.list, ...project.sound.list];
    const assetSet = new Set(assetList.map(item => item.name));
    let counter = 1
    let changedName = name

    while (assetSet.has(changedName) && changedName !== originalName) {
        counter++
        changedName = `${name}_${counter}`
    }

    const isChanged = changedName !== name;
    const msg = isChanged ? `Name must be unique! ${name} already exist. It will be renamed to ${changedName}.` : null;

    return {
        name: changedName,
        isChanged,
        msg
    }
}