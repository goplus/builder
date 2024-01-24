/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-24 08:51:42
 * @FilePath: \builder\spx-gui\src\util\class.ts
 * @Description: The util of class.
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
