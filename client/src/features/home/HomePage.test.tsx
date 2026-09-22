import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { HomePage } from './HomePage'

test('probe', () => {
  render(<HomePage />)
  expect(screen.getByText("Ur a Home Page, 'arry!")).toBeInTheDocument()
})