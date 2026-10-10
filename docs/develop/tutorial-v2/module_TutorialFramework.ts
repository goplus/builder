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
  /** Initial path inside Project Editor, including mode and selection. */
  inEditorPath: string;
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
 *
 * Dispatching is safe as soon as `run()` resolves: the framework holds any
 * event that arrives before the Course program is ready and delivers it, in
 * arrival order, once the program starts. Events are never lost to startup
 * timing.
 */
export type TutorialEvent =
  /** The learner's project runtime started. */
  | { name: "editor.runtime.start"; payload: null }
  /** The learner's project runtime exited with the given code. */
  | { name: "editor.runtime.exit"; payload: { code: number } }
  /**
   * One newly appended runtime log entry. Fired exactly once per new entry,
   * in append order, for `log`-kind outputs only: error output is not part
   * of this channel.
   */
  | { name: "editor.runtime.log"; payload: { log: string } }
  /** A Copilot conversation round completed. */
  | {
      name: "copilot.roundComplete";
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

/**
 * Capabilities passed to the Tutorial framework implementation, grouped to
 * mirror the author-facing API tree.
 *
 * Calls may overlap: while a presentation or generation call is pending, the
 * Course program keeps handling events and may issue further calls,
 * including further presentation calls. The framework does not serialize
 * presentation calls; the Host defines how overlapping presentations are
 * handled. Generation calls can be pending concurrently.
 *
 * On completion the Host must promptly settle every still-pending call so it
 * does not hold shutdown open. The framework waits for running or suspended
 * callbacks to finish; capability failure or cancellation can end execution
 * with an error. The Playground Host cancels pending calls and retains the
 * accepted completion result regardless of subsequent executor errors.
 */
export interface TutorialFrameworkHost {
  /** Internal startup handshake; not exposed to Course authors. */
  lifecycle: {
    /** Waits for the mounted editor UI before triggering onStart. */
    waitForEditor(): Promise<void>;
    /** All onStart callbacks reached their first waiting call or returned.
     * Waits for configuration rendering before uncovering the editor. */
    started(): Promise<void>;
  };
  course: {
    /**
     * Presents the Course opening guide with the given message. Resolves
     * after the learner finishes reading it.
     */
    showPrelude(preludeMessage: string): Promise<void>;
    /**
     * Presents the given message. Resolves after the learner finishes reading
     * it.
     */
    showMessage(message: string): Promise<void>;
    /**
     * Presents a Course-local video. Resolves after the learner finishes
     * watching it. The Host determines how viewing completion is established.
     */
    showVideo(videoName: string): Promise<void>;
    /**
     * Completes the Course without feedback. Resolves as soon as the
     * completion is accepted; it does not wait for the completion dialog.
     * Repeated completion calls are idempotent (the first one wins).
     * The Playground Host ends its Program lifetime when completion is accepted;
     * further capability calls cannot resume interaction with the learner.
     */
    complete(): Promise<void>;
    /**
     * Same completion/idempotency semantics as `complete`, but displays the
     * given feedback.
     */
    completeWith(message: string): Promise<void>;
  };
  editor: {
    codeEditor: {
      /**
       * Limits APIs offered by Code Editor assistance. Each entry is a
       * definition identifier string (`xgo:<package>?<name>#<overloadId>`),
       * the same identifiers the Code Editor uses elsewhere; omitting
       * `#<overloadId>` addresses every overload of the name.
       */
      filterAPIs(apis: string[]): void;
      /**
       * Formats the current code workspace. Resolves after formatting
       * completes.
       */
      formatWorkspace(): Promise<void>;
    };
    project: {
      /**
       * Returns the given sprite's code as it currently stands in the
       * session project. `sprite` is a sprite name (e.g. `"Lita"`), matching
       * how the project models its contents; addressing a sprite the project
       * does not contain fails the capability call. This reads the project
       * rather than a Code Editor UI buffer, and reading whichever code the
       * learner happens to be editing is deliberately not offered yet: it
       * depends on how the Code Editor exposes its attached UIs and their
       * active documents.
       */
      getCode(sprite: string): string;
      /**
       * Lists the session project's sprites by name. A Course whose goal is
       * for the learner to create a sprite cannot know the name they will
       * choose, so it discovers it here.
       */
      listSprites(): string[];
    };
    ruler: {
      /** Enables the Ruler overlay. */
      enable(): void;
      /** Disables the Ruler overlay. */
      disable(): void;
    };
  };
  copilot: {
    /** Generates text without adding a Copilot conversation round. */
    generateText(message: string): Promise<string>;
    /** Generates a JSON value conforming to the framework-derived schema. */
    generateJSON(message: string, schema: JSONSchema): Promise<unknown>;
  };
  spotlight: {
    /**
     * Focuses the existing Spotlight on a UI target and shows a short tip
     * beside it. Resolves once the spotlight is shown; it does not wait for
     * the spotlight to be dismissed, so it never blocks the Course flow.
     * `target` is a Radar selector addressing the UI elements to reveal; see
     * the Radar module design for its syntax. Session-local Radar node IDs
     * are not valid targets. A selector matching several elements reveals
     * them together as one group.
     *
     * A malformed selector fails the capability call, surfacing the
     * authoring mistake during Preview. A well-formed selector that
     * currently matches nothing — the target is filtered out, or not
     * mounted yet — is not an error: the host retries briefly, then
     * resolves without showing anything and logs a warning.
     *
     * `options` is always fully specified here: the author-facing `reveal`
     * defaults are materialized by `createTutorialFramework` before this
     * host method is invoked.
     */
    reveal(
      target: string,
      tip: string,
      options: SpotlightOptions,
    ): Promise<void>;
  };
}

/** Creates the framework passed to `XGoExecutorOptions.framework`. */
export declare function createTutorialFramework(
  host: TutorialFrameworkHost,
): XGoFramework;
