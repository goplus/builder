import type { TextFiles } from "./base";

export type XGoErrorPhase =
  | "initialization"
  | "configuration"
  | "build"
  | "runtime"
  | "capability";
export type XGoExitReason = "completed" | "stopped" | "error";

export type XGoCapability = (request: unknown) => unknown | Promise<unknown>;

export type XGoFramework = {
  /** Selects the corresponding Go-side class-framework binding. */
  name: string;
  /** Explicitly allowed frontend capabilities exposed to that framework. */
  capabilities: Record<string, XGoCapability>;
};

export type XGoExecutorOptions = {
  /** `null` runs plain XGo; otherwise binds the selected class framework. */
  framework: XGoFramework | null;
  onError(phase: XGoErrorPhase, message: string): void;
  onOutput?(message: string): void;
  onExit(reason: XGoExitReason): void;
};

/** Runs one XGo project in an isolated Worker/WASM instance. */
export declare class XGoExecutor {
  constructor(options: XGoExecutorOptions);
  run(files: TextFiles): Promise<void>;
  dispatchEvent(name: string, payload: unknown): Promise<void>;
  stop(): Promise<void>;
}
