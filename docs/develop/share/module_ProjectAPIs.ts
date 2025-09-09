import type {
  FileCollection,
  Visibility,
} from "../../../spx-gui/src/apis/common/index.ts";
import { type ProjectRelease } from "../../../spx-gui/src/apis/project-release.ts";

export type KeyBtn = {
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
export type MobileKeyboardZoneToKeyMapping = KeyBtn[];
/**
 * Mobile keyboard type
 * - NoKeyboard: No keyboard
 * - CustomKeyboard: Custom keyboard
 */
export enum MobileKeyboardType {
  NoKeyboard = 1,
  CustomKeyboard = 2,
}
/**
 * Updated project data structure with mobile keyboard support
 */
export type ProjectData = {
  /** Unique identifier */
  id: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Unique username of the user */
  owner: string;
  /** Full name of the project release from which the project is remixed */
  remixedFrom: string | null;
  /** Latest release of the project */
  latestRelease: ProjectRelease | null;
  /** Unique name of the project */
  name: string;
  /** Version number of the project */
  version: number;
  /** File paths and their corresponding universal URLs associated with the project */
  files: FileCollection;
  /** Visibility of the project */
  visibility: Visibility;
  /** Brief description of the project */
  description: string;
  /** Instructions on how to interact with the project */
  instructions: string;
  /** Universal URL of the project's thumbnail image, may be empty (`""`) */
  thumbnail: string;
  /** Number of times the project has been viewed */
  viewCount: number;
  /** Number of likes the project has received */
  likeCount: number;
  /** Number of releases associated with the project */
  releaseCount: number;
  /** Number of remixes associated with the project */
  remixCount: number;
  /** Mobile keyboard type */
  mobileKeyboardType: MobileKeyboardType;
  /** Zone to key mapping for mobile keyboard */
  mobileKeyboardZoneToKey?: MobileKeyboardZoneToKeyMapping;
};

/**
 * Parameters for creating a new project with mobile keyboard support
 */
export type AddProjectParams = {
  /** Unique name of the project */
  name: string;
  /** File paths and their corresponding universal URLs */
  files: FileCollection;
  /** Visibility of the project */
  visibility: Visibility;
  /** Universal URL of the project's thumbnail image */
  thumbnail?: string;
  /** Mobile keyboard type */
  mobileKeyboardType: MobileKeyboardType;
  /** Zone to key mapping for mobile keyboard */
  mobileKeyboardZoneToKey?: MobileKeyboardZoneToKeyMapping;
};

/**
 * Parameters for creating a project by remixing with mobile keyboard support
 */
export type AddProjectByRemixParams = {
  /** Full name of the project or project release to remix from */
  remixSource: string;
  /** Unique name of the project */
  name: string;
  /** Visibility of the project */
  visibility: Visibility;
  /** Mobile keyboard type */
  mobileKeyboardType: MobileKeyboardType;
  /** Zone to key mapping for mobile keyboard */
  mobileKeyboardZoneToKey?: MobileKeyboardZoneToKeyMapping;
};

/**
 * Parameters for updating an existing project with mobile keyboard support
 */
export type UpdateProjectParams = {
  /** File paths and their corresponding universal URLs */
  files?: FileCollection;
  /** Visibility of the project */
  visibility?: Visibility;
  /** Brief description of the project */
  description?: string;
  /** Instructions on how to interact with the project */
  instructions?: string;
  /** Universal URL of the project's thumbnail image */
  thumbnail?: string;
  /** Mobile keyboard type */
  mobileKeyboardType?: MobileKeyboardType;
  /** Zone to key mapping for mobile keyboard */
  mobileKeyboardZoneToKey?: MobileKeyboardZoneToKeyMapping;
};

/**
 * Project management interface with mobile keyboard support
 */
export interface ProjectService {
  /** Create a new project */
  addProject(
    params: AddProjectParams | AddProjectByRemixParams,
    signal?: AbortSignal
  ): Promise<ProjectData>;

  /** Update an existing project */
  updateProject(
    owner: string,
    name: string,
    params: UpdateProjectParams,
    signal?: AbortSignal
  ): Promise<ProjectData>;
}

/**
 * 全局暴露的键盘事件分发方法
 * ProjectRunner 组件会暴露这个方法供其他组件调用
 */
export declare function dispatchKeyToEvent(type: string, code: string): void;
