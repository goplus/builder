import type { Disposer, JSONSchema, LocaleMessage } from "./base";

export type CopilotTopic = {
  title: LocaleMessage;
  description: string;
  reactToEvents: boolean;
  endable: boolean;
  /** Controls code-block Copy/Insert and code-change Apply helpers in this session. */
  codeHelperEnabled: boolean;
};

export type CopilotRound = {
  userMessage: string;
  resultMessages: string[];
};

/**
 * Serializable snapshot of a session. Consumers treat it as opaque: it is produced by `exportCurrentSession`
 * and only ever passed back to `restoreSession`; the shape of its rounds is the module's own business.
 */
export type CopilotSessionExported = {
  topic: CopilotTopic;
  rounds: unknown[];
};

/** Generic Copilot capabilities. This interface has no Course or Tutorial concepts. */
export interface Copilot {
  /** Starts a session under the given Topic, ending the current session first if needed. */
  startSession(topic: CopilotTopic): Promise<void>;

  /** Ends the current session and cancels its in-progress round. */
  endCurrentSession(): void;

  /** Exports the current session for a later `restoreSession`; null when there is no session. */
  exportCurrentSession(): CopilotSessionExported | null;

  /**
   * Restores an exported session as the current one, ending the current session first. Rounds that were in
   * progress when exported come back cancelled. Does not open or close the Copilot panel.
   * Lets a flow that takes the Copilot over with its own session (the Course Editor's preview) give the
   * previous session back afterwards.
   */
  restoreSession(session: CopilotSessionExported): void;

  /** Generates one plain-text response without adding a round to the current session. */
  generateTextResponse(
    message: string,
    signal?: AbortSignal,
  ): Promise<string>;

  /** Generates one JSON response conforming to the supplied schema. */
  generateJSONResponse(
    message: string,
    schema: JSONSchema,
    signal?: AbortSignal,
  ): Promise<unknown>;

  /** Subscribes to completed rounds through the module's event-emitter API. */
  on(event: "roundComplete", listener: (round: CopilotRound) => void): Disposer;
}
