import { describe, expect, test, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { Input, Select, TextArea, LabelContainer } from './Form'

afterEach(() => {
  cleanup()
})

type LabeledControl = typeof Input | typeof Select | typeof TextArea

function testsLabeledControl(name: string, Component: LabeledControl, role: string) {
  describe(name, () => {
    test('wires label to the real id (manual id)', () => {
      const id = 'test-id'
      const labelText = 'Test Label'

      render(
        <Component label={labelText} id={id} />
      )

      const control = screen.getByRole(role)
      expect(control).toBeInTheDocument()
      const label = screen.getByText(labelText)
      expect(label).toHaveAttribute('for', control.id)
    })
    test('wires label to the real id (auto-generated id)', () => {

      const labelText = 'Test Label'

      render(
        <Component label={labelText} />
      )

      const control = screen.getByRole(role)
      expect(control).toBeInTheDocument()
      const label = screen.getByText(labelText)
      expect(label).toHaveAttribute('for', control.id)

    })
    test('two instances without explicit id do not collide', () => {

      render(
        <>
          <Component />
          <Component />
        </>
      )

      const controls = screen.getAllByRole(role)
      expect(controls[0].getAttribute('id')).not.toBe(controls[1].getAttribute('id'))

    })
    test('fires onChange', () => {
      const handleChange = vi.fn()
      const { getByRole } = render(<Component onChange={handleChange} />)
      const input = getByRole(role)
      fireEvent.change(input, { target: { value: 'New Value' } })
      expect(handleChange).toHaveBeenCalledOnce()
    })
    test('disabled prop reaches the real element', () => {
      const { getByRole } = render(<Component disabled />)
      const control = getByRole(role)
      expect(control).toBeDisabled()
    })
  })
}

testsLabeledControl('Input', Input, 'textbox')
testsLabeledControl('Select', Select, 'combobox')
testsLabeledControl('TextArea', TextArea, 'textbox')

describe('LabelContainer', () => {

  test('renders correctly', () => {

    const testId = 'test-id'

    const elem = <input id={testId} />

    render(
      <LabelContainer label="Test Label" elem={elem} />
    )
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    screen.getByLabelText('Test Label')
  })

  test('renders correctly without label', () => {

    const elem = <input />

    render(
      <LabelContainer elem={elem} />
    )
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    const label = document.querySelector('label')
    expect(label).not.toBeInTheDocument()

  })

})

describe('Input attributes', () => {

  test('renders correctly with placeholder', () => {
    const { getByPlaceholderText } = render(<Input placeholder="Test Input" />)
    expect(getByPlaceholderText('Test Input')).toBeInTheDocument()
  })

  test('renders correctly with a value', () => {
    const { getByDisplayValue } = render(<Input placeholder="Test Input" value="Test Value" onChange={ () => null } />)
    expect(getByDisplayValue('Test Value')).toBeInTheDocument()
  })

})

describe('TextArea attributes', () => {

  test('renders correctly with placeholder', () => {
    const { getByPlaceholderText } = render(<TextArea placeholder="Test TextArea" />)
    expect(getByPlaceholderText('Test TextArea')).toBeInTheDocument()
  })

  test('renders correctly with a value', () => {
    const { getByDisplayValue } = render(<TextArea placeholder="Test TextArea" value="Test Value" onChange={ () => null } />)
    expect(getByDisplayValue('Test Value')).toBeInTheDocument()
  })

})

