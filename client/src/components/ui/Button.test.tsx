import { describe, expect, test, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Button, } from './Button'
import { semanticColors, buttonSizes, buttonColorClassNames, buttonSizeClassNames } from '../../style'

describe('Rendering of Button component', () => {

  test(`renders with default values`, () => {
    const testText = `Button Default`
    const { getByText } = render(<Button>{testText}</Button>)
    const button = getByText(testText)
    expect(button).toHaveClass( buttonColorClassNames['primary'] )
    expect(button).toHaveClass( ...buttonSizeClassNames['md'].split(' ') )
  })

  for( const color of semanticColors ) {
    for( const size of buttonSizes ) {

      test(`renders correctly for color: ${color} and size: ${size}`, () => {
        const testText = `Button ${color} ${size}`
        const { getByText } = render(<Button color={color} size={size}>{testText}</Button>)
        const button = getByText(testText)
        expect(button).toHaveClass( buttonColorClassNames[color] )
        expect(button).toHaveClass( ...buttonSizeClassNames[size].split(' ') )
      })

    }
  }

})

describe('Button onClick behavior', () => {

  test('fires onClick when clicked', () => {
    const handleClick = vi.fn()
    const { getByText } = render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(getByText('Click'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  test('disabled button does not fire onClick', () => {
    const handleClick = vi.fn()
    const { getByText } = render(<Button disabled onClick={handleClick}>Click</Button>)
    const button = getByText('Click')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

})
