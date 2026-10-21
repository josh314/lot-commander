import { useId } from 'react'

export function useGeneratedId(id?: string) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return inputId;
}