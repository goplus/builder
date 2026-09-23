import type { Disposer, RuntimeOutput, SpxProject, UI } from "./base";

/** Route added to the existing Project Editor route space for Simple Mode. */
export type SimpleModeInEditorRoute = `/simple/sprites/${string}`;

/** Existing runtime owned by `EditorState`. */
export interface Runtime {
  readonly outputs: readonly RuntimeOutput[];
  /** Current SPX source location, emitted by ispx at DebugRef granularity. */
  readonly currentLocation: {
    textDocument: { uri: string };
    range: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  } | null;
  /** New event needed by the Tutorial Class Framework runtime namespace. */
  on(event: "didStart", listener: () => void): Disposer;
  on(event: "didChangeOutput", listener: () => void): Disposer;
  on(event: "didChangeLocation", listener: () => void): Disposer;
  on(event: "didExit", listener: (code: number) => void): Disposer;
}

/** Existing Editor State, extended to recognize Simple Mode routes. */
export interface EditorState {
  readonly project: SpxProject;
  readonly runtime: Runtime;
  dispose(): void;
}

/** Existing Editor Context shape; other editor services remain independently provided. */
export type SpxProjectEditorContext = {
  project: SpxProject;
  state: EditorState;
};

/** Relevant API of the existing generic `CodeEditor` class. */
export interface CodeEditor {
  /** Existing workspace formatter. */
  formatWorkspace(): Promise<void>;
  /** Existing workspace diagnostics API. */
  diagnosticWorkspace(signal?: AbortSignal): Promise<unknown>;
  /** Accesses the currently attached Code Editor UI for UI-specific operations. */
  getAttachedUI(): {
    activeTextDocument: { getValue(): string } | null;
    insertInlineText(text: string): Promise<void>;
  } | null;
}

export type StageViewerProps = {
  /** Whether the Ruler overlay is enabled. */
  rulerEnabled: boolean;
};

export type StageViewerEmits = {
  /** Emitted when the learner clicks a revealed sprite name. */
  spriteNameClick: [spriteName: string];
};

/**
 * Existing SPX Project Editor. It consumes Editor Context from
 * `EditorContextProvider` and handles Simple Mode composition internally.
 */
export declare function ProjectEditor(): UI;

/** Stage Viewer component contract extended for Tutorial-controlled UI. */
export declare function StageViewer(props: StageViewerProps): UI;
