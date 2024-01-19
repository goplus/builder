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