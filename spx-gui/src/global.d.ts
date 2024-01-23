/**
 * Add global declaration for File with url property.
 */
declare global {
    interface File {
        url: string;
    }
}

export { File }