export type Disposer = () => void;

export type LocaleMessage = {
  en: string;
  zh: string;
};

/** Universal URL by file path. */
export type FileCollection = Record<string, string>;

/** Loaded files used by frontend models. */
export type Files = Record<string, File>;

export type TextFiles = Record<string, string>;

export type ProjectType = "spx";

/** An in-memory model project. Course projects have no owner or cloud-project identity. */
export interface SpxProject {
  owner: string | null;
  export(): Promise<ProjectSerialized>;
  load(serialized: ProjectSerialized): Promise<void>;
}

export type ProjectSerialized = {
  metadata: {
    type: ProjectType;
  };
  files: Files;
};

export type RuntimeOutput = {
  kind: "log" | "error";
  message: string;
};

export type JSONSchema = Record<string, unknown>;

export type UI = unknown;
