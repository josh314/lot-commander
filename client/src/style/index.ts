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

export const buttonColorClassNames: Record<SemanticColor, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
}

export const buttonSizeClassNames: Record<ButtonSize, string> = {
  xs: 'px-1 py-1 text-xs rounded-sm',
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-base rounded-md',
  lg: 'px-6 py-3 text-lg rounded-lg',
  xl: 'px-8 py-4 text-xl rounded-lg',
}