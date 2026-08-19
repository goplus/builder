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

/**
 * Events dispatched into the running Tutorial program through
 * `XGoExecutor.dispatchEvent`. The Tutorial module is the dispatcher. The
 * framework registers a handler for every event name below, whether or not
 * the Course code subscribed to it. Event names mirror the author-facing API
 * tree.
 */
export type TutorialEvent =
  /** The learner's project runtime started. */
  | { name: "editor.runtime.start"; payload: null }
  /** The learner's project runtime exited with the given code. */
  | { name: "editor.runtime.exit"; payload: { code: number } }
  /**
   * One newly appended runtime log entry. Fired exactly once per new entry,
   * in append order, for `log`-kind outputs only: error output is not part
   * of the judging channel. The Tutorial module adapts the Runtime's
   * `didChangeOutput` notification and cumulative `outputs` array into these
   * per-entry events.
   */
  | { name: "editor.runtime.log"; payload: { log: string } }
  /** A Copilot conversation round finished. */
  | {
      name: "copilot.roundFinish";
      payload: { userMessage: string; resultMessages: string[] };
    };

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
  course_showVideo(videoName: string): Promise<void>;
  /**
   * Completes the Course without feedback. Resolves as soon as the completion
   * is accepted; it does not wait for the completion dialog. After a
   * completion the host treats further presentation capabilities as no-ops,
   * and repeated completion calls are idempotent (the first one wins).
   */
  course_complete(): Promise<void>;
  /** Completes the Course and displays feedback. Same semantics as `course_complete`. */
  course_completeWith(message: string): Promise<void>;
  /** Limits APIs offered by Code Editor assistance. */
  editor_codeEditor_filterAPIs(apis: string[]): void;
  /** Formats the current code workspace. Resolves after formatting completes. */
  editor_codeEditor_formatWorkspace(): Promise<void>;
  /**
   * Returns the code text of the currently attached Code Editor UI, or an
   * empty string when none is attached. For reading a specific file of the
   * session project regardless of the UI state, use `editor_project_getCode`.
   */
  editor_codeEditor_getCode(): string;
  /**
   * Returns the current content of the given code file in the session project
   * model, regardless of what the Code Editor UI shows. `file` is a path
   * relative to the project root (e.g. `"Lita.spx"`); addressing a file that
   * does not exist fails the capability call.
   */
  editor_project_getCode(file: string): string;
  /**
   * Lists the code files of the session project model, e.g. `"main.spx"` and
   * the sprite code files. Assets are not included.
   */
  editor_project_listCodeFiles(): string[];
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
   * beside it. Resolves once the spotlight is shown; it does not wait for the
   * spotlight to be dismissed, so it never blocks the Course flow.
   * `target` is a stable UI-target ID owned and published by the SPX Project
   * Editor (append-only; initially `runButton`, `stopButton`, `rerunButton`,
   * `formatButton`, `codeEditor`, `stage`, `apiReference` and `copilotEntry`);
   * session-local Radar node IDs are not valid targets.
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
