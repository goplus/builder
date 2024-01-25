export default class FileWithUrl extends File {
  url?: string;

  constructor(file: File, url: string) {
    super([file], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });

    this.url = url;
  }
}
