/**
 * The frontend half of the Tutorial Class Framework.
 *
 * Together with the Go package in this directory it forms one complete
 * framework unit: the Go half turns a Course author's calls into capability
 * names plus JSON requests, and this file connects those names to the typed
 * methods of the host, the Tutorial module. The wire names and request fields
 * are the framework's internal contract, both ends evolve inside this
 * directory, and the host never touches JSON.
 *
 * Deliberately dependency-free: nothing is imported from spx-gui, since the
 * XGoFramework shape the executor wants can be declared locally as a
 * structural type, which keeps the whole tools/tutorial directory movable into
 * a repository of its own. spx-gui reaches this file through the symlink
 * src/utils/tutorial-framework.ts, the same way it consumes tools/spxls's
 * index.d.ts.
 */

/** A loose representation of a JSON Schema, structurally identical to
 * JSONSchema in the contract's base.ts. */
export type JSONSchema = Record<string, unknown>;

/** Controls how a spotlight is presented; structurally identical to the type
 * of the same name in the contract's module_TutorialFramework.ts. */
export type SpotlightOptions = {
  /** Whether to dim everything outside the target with an overlay that does
   * not block interaction. */
  mask: boolean;
  /** Auto-conceal delay in seconds; 0 keeps it until the learner clicks
   * anywhere. */
  duration: number;
};

/**
 * Every capability the host provides to a Course program, assembled and
 * implemented by the Tutorial module. It is organized along the author-side
 * API tree (course / editor / copilot / spotlight); for the semantics of each
 * one, when it resolves and how it fails, see
 * docs/develop/tutorial-v2/module_TutorialFramework.ts.
 */
export interface TutorialFrameworkHost {
  course: {
    showPrelude(preludeMessage: string): Promise<void>;
    showMessage(message: string): Promise<void>;
    showVideo(videoName: string): Promise<void>;
    complete(): Promise<void>;
    completeWith(message: string): Promise<void>;
  };
  editor: {
    codeEditor: {
      filterAPIs(apis: string[]): void;
      formatWorkspace(): Promise<void>;
    };
    project: {
      getCode(sprite: string): string;
      listSprites(): string[];
    };
    ruler: {
      enable(): void;
      disable(): void;
    };
  };
  copilot: {
    generateText(message: string): Promise<string>;
    generateJSON(message: string, schema: JSONSchema): Promise<unknown>;
  };
  spotlight: {
    reveal(
      target: string,
      tip: string,
      options: SpotlightOptions,
    ): Promise<void>;
  };
}

// Structurally the same as XGoFramework/XGoCapability in
// spx-gui/src/utils/xgoexec, declared locally to stay dependency-free;
// TypeScript's structural typing keeps the two compatible.
type Capability = (request: unknown) => unknown | Promise<unknown>;
type Framework = { name: string; capabilities: Record<string, Capability> };

// The request shape of each capability, corresponding one to one with what
// the Go side serializes (tutorial.go / editor.go / copilot.go /
// spotlight.go). Changing either side requires changing the other.
type ContentRequest = { content: string };
type VideoRequest = { videoName: string };
type SpriteRequest = { sprite: string };
type FilterAPIsRequest = { apis: string[] };
type GenerateJSONRequest = { content: string; schema: JSONSchema };
type SpotlightRevealRequest = {
  target: string;
  tip: string;
  options: SpotlightOptions;
};

/**
 * Wraps a host implementation into the framework the executor expects.
 *
 * Each entry does only three things: unpack the arguments from the wire shape,
 * call the host method, pass the result through. A capability returning a
 * promise is awaited by the executor before it answers Go, and a synchronous
 * one answers immediately, so no asynchrony is handled here. The Go half
 * materializes spotlight reveal's defaults, so the options arriving here are
 * always complete and the host need not know what a Course's defaults are.
 */
export function createTutorialFramework(
  host: TutorialFrameworkHost,
): Framework {
  return {
    name: "tutorial",
    capabilities: {
      course_showPrelude: (request) =>
        host.course.showPrelude((request as ContentRequest).content),
      course_showMessage: (request) =>
        host.course.showMessage((request as ContentRequest).content),
      course_showVideo: (request) =>
        host.course.showVideo((request as VideoRequest).videoName),
      course_complete: () => host.course.complete(),
      course_completeWith: (request) =>
        host.course.completeWith((request as ContentRequest).content),
      editor_codeEditor_filterAPIs: (request) =>
        host.editor.codeEditor.filterAPIs((request as FilterAPIsRequest).apis),
      editor_codeEditor_formatWorkspace: () =>
        host.editor.codeEditor.formatWorkspace(),
      editor_project_getCode: (request) =>
        host.editor.project.getCode((request as SpriteRequest).sprite),
      editor_project_listSprites: () => host.editor.project.listSprites(),
      editor_ruler_enable: () => host.editor.ruler.enable(),
      editor_ruler_disable: () => host.editor.ruler.disable(),
      copilot_generateText: (request) =>
        host.copilot.generateText((request as ContentRequest).content),
      copilot_generateJSON: (request) => {
        const { content, schema } = request as GenerateJSONRequest;
        return host.copilot.generateJSON(content, schema);
      },
      spotlight_reveal: (request) => {
        const { target, tip, options } = request as SpotlightRevealRequest;
        return host.spotlight.reveal(target, tip, options);
      },
    },
  };
}
