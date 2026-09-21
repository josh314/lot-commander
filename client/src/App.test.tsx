import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

test('probe', () => {
  render(<div>hi</div>)
  expect(screen.getByText('hi')).toBeInTheDocument()
})