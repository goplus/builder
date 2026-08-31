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
   * of this channel.
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

/**
 * Capabilities passed to the Tutorial framework implementation, grouped to
 * mirror the author-facing API tree.
 *
 * Calls may overlap: while a presentation or generation call is pending, the
 * Course program keeps handling events and may issue further calls. The
 * framework serializes presentation (`course.show*`) — at most one is pending
 * at a time — but other calls, including multiple generations, can be pending
 * concurrently.
 *
 * On completion the host must promptly settle every still-pending call (for
 * presentation, resolving as a no-op is fine): the program only exits after
 * pending callbacks finish, so an unsettled call would hold the exit open.
 */
export interface TutorialFrameworkHost {
  course: {
    /**
     * Displays the Course opening guide with the given message. Resolves
     * after the learner dismisses it; presentation never advances
     * automatically.
     */
    showPrelude(preludeMessage: string): Promise<void>;
    /**
     * Displays a message dialog. Resolves after the learner dismisses it;
     * presentation never advances automatically.
     */
    showMessage(message: string): Promise<void>;
    /**
     * Displays a Course-local video. Resolves after the learner finishes
     * watching or closes it; presentation never advances automatically.
     */
    showVideo(videoName: string): Promise<void>;
    /**
     * Completes the Course without feedback. Resolves as soon as the
     * completion is accepted; it does not wait for the completion dialog.
     * After a completion the host treats further presentation capabilities
     * as no-ops, and repeated completion calls are idempotent (the first one
     * wins).
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
      /** Displays the Ruler overlay. */
      show(): void;
      /** Hides the Ruler overlay. */
      hide(): void;
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
