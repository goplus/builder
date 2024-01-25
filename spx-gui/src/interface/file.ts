/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-24 21:42:28
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-25 14:32:14
 * @FilePath: \builder\spx-gui\src\interface\file.ts
 * @Description: The interface of file.
 */

import FileWithUrl from "@/class/FileWithUrl";

/**
 * file interface
 */
export default interface file {
    files: FileWithUrl[];
    config: Config;
    dir?: Record<string, any>;
    path?: string;

    /**
     * Add file to Asset.
     * @param file the file
     */
    addFile: (...file: File[]) => void;

    /**
     * Remove file from Asset.
     * @param file the file
     * @returns the file
     */
    removeFile: (file: File) => void;
}

export interface Source {
    name?: string;
    path: string;
}

export interface Costume extends Source {
    /**
     * x is the x position of the costume in the sprite
     */
    x: number;

    /**
     * y is the y position of the costume in the sprite
     */
    y: number;

    /**
     * cx is the x position of the costume in the sprite
     */
    cx?: number;

    /**
     * cy is the y position of the costume in the sprite
     */
    cy?: number;

    /**
     * sx is the x position of the costume in the sprite
     */
    sx?: number;

    /**
     * sy is the y position of the costume in the sprite
     */
    sy?: number;

    /**
     * index of the costume
     */
    index?: number;

    /**
     * file of the costume
     */
    file?: File;

    /**
     * url of the costume
     */
    url?: string;
}

export interface Config {
    [key: string]: any
}

export interface SpriteConfig extends Config {
    /**
     * Costumes of the sprite.
     */
    costumes: Costume[];

    /**
     * Index of the current costume.
     */
    costumeIndex: number;

    /**
     * Heading of the sprite in degrees, from -180 to 180.
     */
    heading: number;

    /**
     * The sprite is draggable or not.
     */
    isDraggable: boolean;

    /**
     * Rotation style: "normal" or "leftright"
     */
    rotationStyle: string;

    /**
     * size of the sprite, 1 = 100%, 0.5 = 50%, 0.25 = 25%
     */
    size: number;

    /**
     * The sprite is visible or not.
     */
    visible: boolean;

    /**
     * x coordinate of the sprite in the stage
     */
    x: number;

    /**
     * y coordinate of the sprite in the stage
     */
    y: number;
}

export interface SoundConfig extends Config, Source {
    /**
     * Volume of the sound.
     */
    volume?: number;

    /**
     * Rate of the sound.
     */
    rate?: number;

    /**
     * Sample count of the sound.
     */
    sampleCount?: number;
}

export interface BackdropConfig extends Config {
    /**
     * The image of the backdrop.
     */
    scenes: Source[];

    /**
     * The sprite zorder in the stage, the later Sprite will be above the previous Sprite, which means that the later Sprite will override the previous Sprite.
     */
    zorder: string[];
}