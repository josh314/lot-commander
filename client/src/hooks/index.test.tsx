import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useDebouncedValue } from './index'

function DebouncedValueProbe( { value, delay }: { value: string, delay: number } ) {
  const debounced = useDebouncedValue( value, delay )
  return <div data-testid="debounced">{debounced}</div>
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test('does not update before the delay elapses', () => {
  const { rerender } = render(<DebouncedValueProbe value="a" delay={300} />)
  rerender(<DebouncedValueProbe value="b" delay={300} />)

  act(() => {
    vi.advanceTimersByTime(299)
  })

  expect(screen.getByTestId('debounced')).toHaveTextContent('a')
})

test('updates once the delay elapses', () => {
  const { rerender } = render(<DebouncedValueProbe value="a" delay={300} />)
  rerender(<DebouncedValueProbe value="b" delay={300} />)

  act(() => {
    vi.advanceTimersByTime(300)
  })

  expect(screen.getByTestId('debounced')).toHaveTextContent('b')
})

test('resets the timer on rapid successive changes, rather than applying each one', () => {
  // "a" is shown immediately on mount via useState's initializer, not the timer -
  // the mount-time timer this schedules would just reset debouncedValue to "a" again
  // if left to fire, so cancelling it below (via the rerender to "b") changes nothing
  const { rerender } = render(<DebouncedValueProbe value="a" delay={300} />)

  rerender(<DebouncedValueProbe value="b" delay={300} />)
  act(() => {
    vi.advanceTimersByTime(200)
  })
  rerender(<DebouncedValueProbe value="c" delay={300} />)
  act(() => {
    vi.advanceTimersByTime(200)
  })

  // only 200ms since the latest change ("c") - still mid-debounce
  expect(screen.getByTestId('debounced')).toHaveTextContent('a')

  act(() => {
    vi.advanceTimersByTime(100)
  })

  expect(screen.getByTestId('debounced')).toHaveTextContent('c')
})
