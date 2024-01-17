export abstract class AssetBase {
    files: File[] = [];
    name: string = "Untitled";
    config: Record<string, any> = {};

    /**
     * Add file to Asset.
     * @param file File
     */
    addFile(...file: File[]): void {
        this.files.push(...file);
    }

    /**
     * Remove file from Asset.
     * @param file File
     */
    removeFile(file: File): void {
        const index = this.files.indexOf(file);
        if (index > -1) {
            this.files.splice(index, 1);
        }
    }
}

export interface asset {
    dir: Record<string, any>;
    path: string;
}