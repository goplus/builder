# Improve performance-related user experience by updating LSP client

### Background

With big projects, for example, the [PLANTS_vs_ZOMBIES](https://x.qiniu.com/project/go-wyvern/PLANTS_vs_ZOMBIES), the user experience of the code editor gets terrible as the time cost of the language-server related features increases.

With every code content change, several LSP requests will be sent, which costs 200-500ms for each request (tested in Macbook Air M4, it gets much worse on regular PCs). The delay is especially noticeable when the user types fast, as the LSP client sends requests for every keystroke. And because now the language server runs in the same thread as UI, including the code editor, the UI freezes until the LSP request is completed.

### Optimization

* Run LSP client in Web Worker, which is a separate thread, so that the UI won't freeze when the LSP request is being processed.
* Implement [cancellation](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#cancelRequest) for LSP requests, so that the client can cancel requests when they are no longer needed (e.g., ongoing diagnostics request when the user types a new character).

  An optional solution to avoid unnecessary LSP requests is to debounce the requests, but it may cause the user to wait for a longer time to see the results. We have to trade off between the responsiveness and performance of the code editor. With cancellation, the two can be better balanced.
