export interface Spotlight {
  reveal: (
    /** The element to reveal */
    el: HTMLElement,
    /** Tip to show when element revealed */
    tip?: string
  ) => string
}

/** Hook to access the Spotlight instance */
export declare function useSpotlight(): Spotlight
