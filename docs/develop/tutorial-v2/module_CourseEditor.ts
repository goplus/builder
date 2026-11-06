import type { UI } from "./base";

export type CourseEditorProps = {
  courseSeriesID: string;
  courseID: string;
};

/**
 * Loads and edits the identified Course and its Tutorial-project directory.
 * It uses Course APIs internally for loading and saving.
 * Tutorial-program diagnostics, completion, hover, formatting and symbol rename are provided by a Language Server
 * owned by the entire Course Editor session and available across its authoring views.
 * It reads the current in-memory program, including unsaved edits, undo and redo.
 * The authoring language-server workspace is isolated from the embedded SPX editor and learner Preview.
 */
export declare function CourseEditor(props: CourseEditorProps): UI;
