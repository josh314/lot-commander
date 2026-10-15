export const semanticColors = [
  'primary',
  'secondary',
  'success',
  'danger',
  'warning',
  'info',
] as const

export type SemanticColor = typeof semanticColors[number]

export const buttonSizes = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
] as const

export type ButtonSize = typeof buttonSizes[number]
