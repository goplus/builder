import type { FileCollection, JSONSchema, ProjectType } from "./base";
import type { XGoFramework } from "./module_XGoExecutor";

/**
 * Schema of the root `index.json` in a Tutorial project.
 * See `example-tutorial-course/` for a complete directory example.
 */
export type TutorialProjectIndex = {
  /** Directory containing the serialized learner project. */
  project: {
    /** Project model used to load the directory. */
    type: ProjectType;
    /** Course-relative path to the project root. */
    root: string;
  };
  /** Initial route inside Project Editor, including mode and selection. */
  inEditorRoute: string;
  /** Course-author-provided instructions not shown in the learner UI. */
  copilotContext: string;
};

/**
 * Persisted Tutorial-project directory. Paths in `index.json` are relative to
 * this collection and may address XGo source, SPX project files or resources.
 */
export type TutorialProjectFiles = FileCollection;

/** Controls how the spotlight presents a UI target. */
export type SpotlightOptions = {
  /**
   * Dims everything except the revealed target with a translucent overlay
   * that directs the learner's attention.
   */
  mask: boolean;
  /**
   * Auto-conceal delay in seconds. `0` keeps the spotlight visible until the
   * learner clicks anywhere.
   */
  duration: number;
};

/** Flat capabilities passed to the Tutorial framework implementation. */
export interface TutorialFrameworkHost {
  /**
   * Displays the Course opening guide with the given message. Resolves after
   * the learner dismisses it; presentation never advances automatically.
   */
  course_showPrelude(preludeMessage: string): Promise<void>;
  /**
   * Displays a message dialog. Resolves after the learner dismisses it;
   * presentation never advances automatically.
   */
  course_showMessage(message: string): Promise<void>;
  /**
   * Displays a Course-local video. Resolves after the learner finishes
   * watching or closes it; presentation never advances automatically.
   */
  course_showVideo(videoPath: string): Promise<void>;
  /** Completes the Course without feedback. */
  course_complete(): Promise<void>;
  /** Completes the Course and displays feedback. */
  course_completeWith(message: string): Promise<void>;
  /** Limits APIs offered by Code Editor assistance. */
  editor_codeEditor_filterAPIs(apis: string[]): void;
  /** Formats the current code workspace. */
  editor_codeEditor_formatWorkspace(): Promise<void>;
  /** Returns the learner's current code. */
  editor_codeEditor_getCode(): string;
  /** Displays the Ruler overlay. */
  editor_ruler_show(): void;
  /** Hides the Ruler overlay. */
  editor_ruler_hide(): void;
  /** Generates text without adding a Copilot conversation round. */
  copilot_generateText(message: string): Promise<string>;
  /** Generates a JSON value conforming to the framework-derived schema. */
  copilot_generateJSON(message: string, schema: JSONSchema): Promise<unknown>;
  /**
   * Focuses the existing Spotlight on a UI target and shows a short tip
   * beside it. Spotlight presentation never blocks the Course flow.
   * `target` is a stable UI-target ID owned and published by the SPX Project
   * Editor; session-local Radar node IDs are not valid targets.
   * `options` is always fully specified here: the author-facing `reveal`
   * defaults are materialized by `createTutorialFramework` before this host
   * method is invoked.
   */
  spotlight_reveal(
    target: string,
    tip: string,
    options: SpotlightOptions,
  ): Promise<void>;
}

/** Creates the framework passed to `XGoExecutorOptions.framework`. */
export declare function createTutorialFramework(
  host: TutorialFrameworkHost,
): XGoFramework;
