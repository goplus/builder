import * as color from './colors'

export { color }

export const fontSize = {
  // Standard text scale anchored at base = 14px, which maps to F4 in the design.
  // F7 / H8 auxiliary text used by label bars and compact metadata.
  '2xs': '10px',
  // F6 supporting text used by helper copy and secondary labels.
  xs: '12px',
  // F5 compact text used by smaller actions and metadata.
  sm: '13px',
  // F4 default text size for regular body and emphasized inline text.
  base: '14px',
  // F3 button text for primary and large actions.
  lg: '15px',
  // F2 standard title for section and card headers.
  xl: '16px',
  // F1 special title for prominent page and hero headings.
  '2xl': '20px'
} as const

export const fontFamily = {
  // Figma typography uses self-hosted Inter for EN and self-hosted Source Han Sans SC for CN in the same stack.
  main: `Inter,
  'Source Han Sans SC',
  'PingFang SC',
  'Hiragino Sans GB',
  'Noto Sans CJK SC',
  'Microsoft YaHei',
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  Roboto,
  'Helvetica Neue',
  Arial,
  'Noto Sans',
  sans-serif,
  'Apple Color Emoji',
  'Segoe UI Emoji',
  'Segoe UI Symbol',
  'Noto Color Emoji'`,
  // Monospace stack for code editor and technical data displays.
  code: 'Menlo, Monaco, "Courier New", monospace'
}

export const borderRadius = {
  // Auxiliary 4px radius used by tags and interior content blocks nested inside 8px surfaces.
  sm: '4px',
  // Primary 8px radius used by buttons, panels, and most cards.
  md: '8px',
  // Auxiliary 12px radius used by popups and outer floating surfaces around 8px content.
  lg: '12px'
} as const

export const boxShadow = {
  // Secondary small shadow for hover popups and hover-elevated cards, such as tooltip-like explainer popups and dropdown menus.
  sm: '0px 4px 12px 0px rgba(36, 41, 47, 0.08)',
  // Primary panel shadow used by editor panels, profile panels, and community panels.
  md: '0px 6px 16px 0px rgba(36, 41, 47, 0.05)',
  // Secondary large shadow for copilot dialog level floating panels and other prominent floating layers.
  lg: '0px 8px 24px 8px rgba(36, 41, 47, 0.05)',
  // Brand-accent glow for the asset-library search bar and login-page entry surfaces.
  brand: '0px 4px 12px 0px rgba(175, 231, 236, 0.65)',
  // Subtle control shadow for navigation tabs, code-editor tabs, and similarly compact control surfaces.
  control: '2px 2px 3px 0px rgba(36, 41, 47, 0.04)'
} as const

export const lineHeight = {
  // Small control height used by compact inputs and buttons.
  sm: '26px',
  // Default control height used by most interactive components.
  md: '32px',
  // Large control height used by primary actions and tall controls.
  lg: '40px'
} as const

export const spacing = {
  // Tight inner spacing and compact gaps.
  sm: '4px',
  // Default small spacing for closely related controls.
  md: '8px',
  // Medium spacing for regular component internals.
  lg: '12px',
  // Large semantic spacing; use numeric Tailwind spacing classes for 24px / 28px and above.
  xl: '16px'
} as const
