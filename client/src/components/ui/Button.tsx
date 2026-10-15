import React from 'react'
import type { SemanticColor, ButtonSize } from '../../style'

const buttonColorClassNames: Record<SemanticColor, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
}

const buttonSizeClassNames: Record<ButtonSize, string> = {
  xs: 'px-1 py-1 text-xs rounded-sm',
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-base rounded-md',
  lg: 'px-6 py-3 text-lg rounded-lg',
  xl: 'px-8 py-4 text-xl rounded-lg',
}

export function Button( { color, size = 'md', children }: { color: SemanticColor; size?: ButtonSize; children: React.ReactNode } ) {

  const baseClasses = 'inline-flex border-hidden text-center text-paper'

  const className = `${baseClasses} ${buttonColorClassNames[color]} ${buttonSizeClassNames[size]}`

  return (
    <button className={className}>
      {children}
    </button>
  )
}