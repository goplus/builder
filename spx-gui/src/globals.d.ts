declare global {
  interface Window {
    // Required to communicate with Go WASM.
    project_path: string;
    // Formatter function in Go WASM.
    formatSPX(input: string): FormatResponse;
  }
}
