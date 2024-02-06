/*
 * @Author: Xu Ning
 * @Date: 2024-01-24 21:42:28
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-25 14:26:10
 * @FilePath: \builder\spx-gui\src\class\FileWithUrl.ts
 * @Description: The class of a file with url.
 */
export default class FileWithUrl extends File {
  // @ts-ignore
  url?: string;

  constructor(file: File, url: string) {
    super([file], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });

    this.url = url;
  }
}
