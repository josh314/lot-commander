import { useId, type ComponentPropsWithRef } from 'react';

interface InputProps extends ComponentPropsWithRef<'input'> {
  label?: string;
}

interface SelectInputProps extends ComponentPropsWithRef<'select'> {
  label?: string;
}

function renderWithLabel(input: React.ReactNode, label?: string) {
  return label ? <LabelContainer label={label ?? ""}>{input}</LabelContainer> : input
}

export const LabelContainer = ({ children, label }: { children: React.ReactNode, label: string }) => (
  <div className="inline-flex flex-col">
    {label && <label className="font-medium text-base mb-1">{label}</label>}
    {children}
  </div>
);

const inputClassName = "p-1.5 border border-line rounded-sm bg-paper";

export function Input({ label, id, className , ...props }: InputProps) {

  const generatedId = useId();
  const inputId = id ?? generatedId;

  const input = <input id={inputId} className={`${inputClassName} ${className ?? ''}`} {...props} />

  return (
    <>
      {renderWithLabel(input, label)}
    </>
  );
}

export function TextInput( props: Omit<InputProps, 'type'> ) {
  return <Input {...props} type="text" />;
}

export function NumberInput( props: Omit<InputProps, 'type'> ) {
  return <Input {...props} type="number" />;
}

export function SelectInput({ children, label, id, className, ...props }: SelectInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const input = <select id={inputId} className={`${inputClassName} ${className ?? ''}`} {...props}>
    {children}
  </select>;

  return (
    <>
      {renderWithLabel(input, label)}
    </>
  )
}

export function FieldSet({ children, legend, className }: { children: React.ReactNode, legend?: string, className?: string }) {
  return (
    <fieldset className={`border border-line rounded-xs px-4 py-2 ${className ?? ''}`}>
      { legend && <legend className="font-semibold text-lg px-1 mb-1">{legend}</legend> }
      {children}
    </fieldset>
  );
}