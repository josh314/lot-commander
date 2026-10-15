import React from 'react'
import type { SemanticColor, ButtonSize } from '../../style'
import { buttonColorClassNames, buttonSizeClassNames } from '../../style'

interface ButtonProps extends React.ComponentProps<'button'> {
  color?: SemanticColor
  size?: ButtonSize
  children: React.ReactNode
}


export function Button( { color = 'primary', size = 'md', children, ...props }: ButtonProps ) {

  const baseClasses = 'inline-flex border-hidden text-center text-paper'

  const className = `${baseClasses} ${buttonColorClassNames[color]} ${buttonSizeClassNames[size]}`

  return (
    <button className={className} {...props} >
      {children}
    </button>
  )
}