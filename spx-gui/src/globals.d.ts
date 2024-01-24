interface Window {
  // Required to communicate with Go WASM.
  project_path: string;
}

/**
 * Formatter function in Go WASM.
 * @param input
 */
declare function formatSPX(input: string): FormatResponse;
