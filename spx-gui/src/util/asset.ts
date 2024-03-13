import type { Project } from "@/class/project"
import { keywords, typeKeywords } from "@/components/code-editor/language"

interface checkInfo {
    /** the updated name if there are assets with the same name */
    name: string
    /** whether the name is changed */
    isChanged: boolean
    /** whether the name is same as the original */
    isSame: boolean
    /** the warning message */
    msg: string | null
}

export const isValidAssetName = (name: string) => {
    // spx code is go+ code, and the asset name will compiled to an identifier of go+
    // so asset name rules is depend on the identifier rules of go+.
    const regex = /^[\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_]*$/
    return regex.test(name) && !typeKeywords.includes(name) && !keywords.includes(name)
}

/**
 * Check if the name is unique and return the updated name and other information.
 * @param name the name of the asset
 * @param project the project
 * @param originalName If originalName is null, then he will get the name that should be held in the project; otherwise, he will find the name that should be held in the project excluding originalName.
 * @returns the check info
 */
export function checkUpdatedName(name: string, project: Project, originalName: string | null = null): checkInfo {
    if (!isValidAssetName(name)) throw new Error('Cannot update asset name. Name is invalid! ')

    const assetList = [...project.sprite.list, ...project.sound.list];
    const assetSet = new Set(assetList.map(item => item.name));
    let counter = 1
    let changedName = name

    // if assetSet has the same name, add a suffix to the name.
    // if the changed name is same as the original name, break the loop.
    while (assetSet.has(changedName) && changedName !== originalName) {
        counter++
        changedName = `${name}_${counter}`
    }

    const isChanged = changedName !== name;
    const isSame = changedName === originalName;
    const msg = isChanged ? `Name must be unique! ${name} already exist. You can rename it to ${changedName}.` : null;

    return {
        name: changedName,
        isChanged,
        isSame,
        msg
    }
}