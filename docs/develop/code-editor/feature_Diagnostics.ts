class DiagnosticsProviderImpl extends EmitterImpl<{
  didChangeDiagnostics: []
}> implements DiagnosticsProvider {

  constructor() {
    super()

    lsp.onNotification('textDocument/publishDiagnostics', () => this.emit('didChangeDiagnostics'))
    runtime.on('didChangeOutput', () => this.emit('didChangeDiagnostics'))
  }

  async provideDiagnostics(ctx: DiagnosticsContext) {
    const result = await lsp.request('textDocument/diagnostic', ctx.textDocument.id)
    const lspDiagnostics = result.items.map(diagnostic => ({
      range: diagnostic.range,
      severity: diagnostic.severity,
      message: diagnostic.message
    }))
    const runtimeOutputs = await runtime.getOutput()
    const runtimeDiagnostics = runtimeOutputs
      .filter(output => output.kind === RuntimeOutputKind.Error)
      .filter(output => output.source.textDocument.uri === ctx.textDocument.id.uri)
      .map(error => ({
        range: error.source.range,
        severity: DiagnosticSeverity.Error,
        message: error.message
      }))
    return [...lspDiagnostics, ...runtimeDiagnostics]
  }
}

ui.registerDiagnosticsProvider(new DiagnosticsProviderImpl())
