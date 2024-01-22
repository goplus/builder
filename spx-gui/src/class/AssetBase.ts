import file from "@/interface/file";

/**
 * @abstract
 * @class AssetBase
 * 
 * @author tgb
 * @createDate 2024-01-18
 */
export default abstract class AssetBase implements file {
    protected _files: File[];
    public name: string;
    public config: Record<string, any>;

    constructor(name: string, files: File[] = [], config: Record<string, any> = {}) {
        this.name = name
        this._files = files
        this.config = config
    }

    /**
     * Get files.
     */
    get files(): File[] {
        return this._files
    }

    /**
     * Add file to Asset.
     * @param file File
     */
    addFile(...file: File[]): void {
        let exist = [];
        for (const f of file) {
            if (this._files.find(file => file.name === f.name)) {
                exist.push(f);
                continue;
            }
            this._files.push(f);
        }
        if (exist.length) {
            throw new Error(`All files in ${this.name} must be unique. ${exist.map(file => file.name).join(', ')} already exist.`)
        }
    }

    /**
     * Remove file from Asset.
     * @param file File
     */
    removeFile(file: File): void {
        const index = this._files.indexOf(file);
        if (index > -1) {
            this._files.splice(index, 1);
        }
    }

    /**
     * Load file from URL
     * @param url the url of zip file
     */
    loadFileFromURL(url: string) {
        // TODO
    }
}
