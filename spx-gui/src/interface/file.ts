/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-24 08:53:47
 * @FilePath: \builder\spx-gui\src\interface\file.ts
 * @Description: The interface of file.
 */

/**
 * file interface
 */
export default interface file {
    files: File[];
    config: Record<string, any>;
    dir?: Record<string, any>;
    path?: string;

    addFile: (...file: File[]) => void;
    removeFile: (file: File) => void;
}