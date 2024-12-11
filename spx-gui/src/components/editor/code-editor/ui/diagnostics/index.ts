import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import type Emitter from '@/utils/emitter'
import { type BaseContext, type Diagnostic } from '../../common'
import type { CodeEditorUI } from '..'
import type { TextDocument } from '../text-document'

export type DiagnosticsContext = BaseContext

export interface IDiagnosticsProvider
  extends Emitter<{
    didChangeDiagnostics: []
  }> {
  provideDiagnostics(ctx: DiagnosticsContext): Promise<Diagnostic[]>
}

export class DiagnosticsController extends Disposable {
  private providerRef = shallowRef<IDiagnosticsProvider | null>(null)

  registerProvider(provider: IDiagnosticsProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  private diagnosticsRef = shallowRef<Diagnostic[] | null>(null)
  get diagnostics() {
    return this.diagnosticsRef.value
  }

  private async refreshDiagnostics(provider: IDiagnosticsProvider, textDocument: TextDocument, signal: AbortSignal) {
    this.diagnosticsRef.value = await provider.provideDiagnostics({ textDocument, signal })
  }

  private lastTryCtrl: AbortController | null = null
  private tryRefreshDiagnostics() {
    const textDocument = this.ui.activeTextDocument
    const provider = this.providerRef.value
    if (textDocument == null || provider == null) return
    if (this.lastTryCtrl != null) this.lastTryCtrl.abort()
    this.lastTryCtrl = new AbortController()
    this.refreshDiagnostics(provider, textDocument, this.lastTryCtrl.signal)
  }

  init() {
    this.addDisposer(
      watch(
        () => this.ui.activeTextDocument,
        (textDocument, __, onCleanup) => {
          if (textDocument == null) return
          this.tryRefreshDiagnostics()
          onCleanup(textDocument.on('didChangeContent', () => this.tryRefreshDiagnostics()))
        },
        { immediate: true }
      )
    )
    this.addDisposer(
      watch(
        this.providerRef,
        (provider, __, onCleanup) => {
          if (provider == null) return
          this.tryRefreshDiagnostics()
          onCleanup(provider.on('didChangeDiagnostics', () => this.tryRefreshDiagnostics()))
        },
        { immediate: true }
      )
    )
  }
}
