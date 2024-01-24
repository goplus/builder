import FileWithUrl from "@/class/FileWithUrl";

/**
 * file interface
 */
export default interface file {
    files: FileWithUrl[];
    config: Record<string, any>;
    dir?: Record<string, any>;
    path?: string;

    addFile: (...file: File[]) => void;
    removeFile: (file: File) => void;
}