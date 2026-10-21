import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { useGeneratedId } from './generated-id'

function TestComponent({ id }: { id?: string }) {
  const generatedId = useGeneratedId(id);
  return <div data-testid="generated-id">{generatedId}</div>;
}

test('generates an ID when no ID is provided', () => {
  render(<TestComponent />);
  const generatedId = screen.getByTestId('generated-id').textContent;
  expect(generatedId).toBeTruthy();
});

test('uses the provided ID when one is given', () => {
  render(<TestComponent id="custom-id" />);
  const generatedId = screen.getByTestId('generated-id').textContent;
  expect(generatedId).toBe('custom-id');
});