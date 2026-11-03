import * as z from 'zod';
import { InvalidRequestError } from './errors';

export function parseRequest<T extends z.ZodType>(schema: T, value: unknown, name?: string): z.infer<T> {
  if( name ) {
    const result = z.object({ [name]: schema }).safeParse({ [name]: value });
    if (!result.success) {
      throw new InvalidRequestError(
        z.prettifyError(
          result.error
        )
      );
    }
    return  (result.data as Record<string, z.infer<T>>)[name]
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new InvalidRequestError(
      z.prettifyError(
        result.error
      )
    );
  }
  return result.data;
}
