/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 16:17:32
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-25 12:15:36
 * @FilePath: /spx-gui-front-private/src/util/global.js
 * @Description: 
 */

/**
 * Check if an object is empty
 * @param obj an object
 * @returns 
 */
export function isObjectEmpty(obj: any) {
    if (!obj) return true
    return Object.keys(obj).length === 0
}