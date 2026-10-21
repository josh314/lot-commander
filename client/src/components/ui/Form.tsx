import type { ComponentPropsWithRef } from 'react';
import { useGeneratedId } from '../../hooks/generated-id';

interface InputProps extends ComponentPropsWithRef<'input'> {
  label?: string;
}

interface SelectProps extends ComponentPropsWithRef<'select'> {
  label?: string;
}

interface TextAreaProps extends ComponentPropsWithRef<'textarea'> {
  label?: string;
}

const inputClassName = "p-1.5 border border-line rounded-sm bg-paper";

function useControlProps({ id, className }: { id?: string; className?: string }) {
  const controlId = useGeneratedId(id)
  return { id: controlId, className: `${inputClassName} ${className ?? ''}` }
}

export const LabelContainer = ({ elem, label }: { elem: React.ReactElement<{ id?: string }>, label?: string }) => {
  if(!label ) return elem;

  const elemId = elem.props.id;

  return (
    <div className="inline-flex flex-col">
      {label && <label className="font-medium text-base mb-1" htmlFor={elemId}>{label}</label>}
      {elem}
    </div>
  )
}

export function Input({ label, id, className, ...props }: InputProps) {
  const elem = <input {...useControlProps({ id, className })} {...props} />
  return <LabelContainer elem={elem} label={label}/>
}

export function TextInput( props: Omit<InputProps, 'type'> ) {
  return <Input {...props} type="text" />;
}

export function NumberInput( props: Omit<InputProps, 'type'> ) {
  return <Input {...props} type="number" />;
}

export function Select({ children, label, id, className, ...props }: SelectProps) {
  const elem = <select {...useControlProps({ id, className })} {...props}>{children}</select>
  return <LabelContainer elem={elem} label={label}/>
}

export function TextArea({ label, id, className, ...props }: TextAreaProps) {
  const elem = <textarea {...useControlProps({ id, className })} {...props} />
  return <LabelContainer elem={elem} label={label}/>
}

export function FieldSet({ children, legend, className }: { children: React.ReactNode, legend?: string, className?: string }) {
  return (
    <fieldset className={`border border-line rounded-xs px-4 py-2 ${className ?? ''}`}>
      { legend && <legend className="font-semibold text-lg px-1 mb-1">{legend}</legend> }
      {children}
    </fieldset>
  );
}