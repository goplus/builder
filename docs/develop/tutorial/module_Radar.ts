import { UI } from './base'

/**
 * Component RadarRoot initializes the Radar instance. Sample:
 * ```tsx
 * <RadarRoot>
 *   <!-- Application UI -->
 * </RadarRoot>
 * ```
 */
export declare function RadarRoot(): UI

/**
 * Component RadarNode. Sample:
 * ```tsx
 * <RadarNode name="Navbar" description="The main navigation bar of the application.">
 *   <!-- Node UI content -->
 * </RadarNode>
 * ```
 */
export declare function RadarNode(props: {
  /** Descriptive name of the node */
  name: string
  /** Desciption of the node */
  description: string
}): UI

export type RadarNodeInfo = {
  /** Unique identifier for the node */
  id: string
  /** Descriptive name of the node */
  name: string
  /** Desciption of the node */
  description: string
  /** Get the HTML element representing the node */
  getElement(): HTMLElement | null
  /** Get the children of the node */
  getChildren(): RadarNodeInfo[]
}

export interface Radar {
  /** Get the root nodes of the UI tree */
  getRootNodes(): RadarNodeInfo[]
  /** Get a node by its ID */
  getNodeById(id: string): RadarNodeInfo | null
}

/** Hook to access the Radar instance */
export declare function useRadar(): Radar
