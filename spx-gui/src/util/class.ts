/*
 * @Author: Tu Guobin
 * @Date: 2024-01-17 19:48
 * @LastEditors: Tu Guobin
 * @LastEditTime: 2024-01-17 19:48
 * @FilePath: /spx-gui/src/util/class.ts
 */

/**
 * Check if an object is an instance of a class.
 * @param obj The object to check.
 * @param ctor The constructor of the class.
 * @returns True if the object is an instance of the class, false otherwise.
 */
export function isInstance<T>(obj: any, ctor: { new(...args: any[]): T }): obj is T {
    if (Array.isArray(obj)) {
        return obj.every(item => isInstance(item, ctor));
    }
    return obj instanceof ctor;
}
