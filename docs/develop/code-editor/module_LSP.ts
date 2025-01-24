interface TextEdit {
	range: Range
	newText: string
}

interface WorkspaceEdit {
	changes?: { [uri: string]: TextEdit[] }
}

declare interface LSPClient {
  request(method: string, params: TODO): Promise<TODO>
  onNotification(method: string, listener: (params: TODO) => void): Disposer
}
