/** Stable metadata attached to one UI element. */
export type RadarNodeMeta = {
  /** Kebab-case semantic UI role. */
  name: string
  /** Optional accessible-label override. */
  label?: string
  /** Human-readable description. */
  desc: string
  /** Optional stable instance values. Nullish values are ignored. */
  attrs?: Record<string, string | null | undefined>
  /** Whether the node participates in the visible Radar tree. */
  visible?: boolean
}

export type RadarNodeInfo = {
  id: string
  name: string
  label: string
  desc: string
  attrs: Record<string, string>
  visible: boolean
  getElement(): HTMLElement
  getChildren(includeInvisible?: boolean): RadarNodeInfo[]
}

/** Thrown for malformed Radar selectors. */
export declare class RadarSelectorSyntaxError extends SyntaxError {}

export interface Radar {
  getRootNodes(): RadarNodeInfo[]
  getNodeById(id: string): RadarNodeInfo | null
  /** Returns visible matches in document order. */
  selectAll(selector: string): RadarNodeInfo[]
}

/** Hook to access the Radar instance. */
export declare function useRadar(): Radar

/**
 * Radar selectors use the following grammar:
 *
 * selector          = compound, { whitespace, compound } ;
 * compound          = name, { attribute } ;
 * attribute         = "[", attribute-name, "=", JSON-string, "]" ;
 * name              = kebab-case-identifier ;
 * attribute-name    = kebab-case-identifier ;
 *
 * Whitespace is a descendant combinator. All name and attribute comparisons
 * are exact and case-sensitive. Selectors return every matching visible node;
 * an invalid selector throws `RadarSelectorSyntaxError`, while a valid
 * selector with no match returns an empty array.
 */
export type RadarSelector = string
