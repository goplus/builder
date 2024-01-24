/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-24 01:40:40
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-24 08:52:04
 * @FilePath: \builder\spx-gui\src\global.d.ts
 * @Description: The global declaration.
 */

/**
 * Add global declaration for File with url property.
 */
declare global {
    interface File {
        url: string;
    }
}

export { File }