import { ITagging } from "./module_tagging";

export class Tagging implements ITagging {
    key: string

    constructor(key: string) {
        if (!key) {
            throw new Error('Tagging key must not be empty');
        }
        this.key = key;
    }

    /** get html element by Tagging's key */
    public getElement(): HTMLElement | null {
        return document.querySelector<HTMLElement>(`[data-tag="${this.key}"]`);
    }
}