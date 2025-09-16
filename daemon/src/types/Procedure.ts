import z, { ZodType } from 'zod';
import { type Session } from '../registry/Session';

export type Procedure<N = string, IS = ZodType, O = unknown> = {
  path: N;
  inputSchema: IS;
} & (
  | { handlerForApiToken(input: z.infer<IS>): Promise<O> }
  | { handlerForSession(input: z.infer<IS>, session: Session): Promise<O> }
);

export function createApiTokenProcedure<N extends string, IS extends ZodType, O extends unknown>(
  path: N,
  inputSchema: IS,
  handlerForApiToken: (input: z.infer<IS>) => Promise<O>
): Procedure<N, IS, O> {
  return { path, inputSchema, handlerForApiToken };
}

export function createSessionProcedure<N extends string, IS extends ZodType, O extends unknown>(
  path: N,
  inputSchema: IS,
  handlerForSession: (input: z.infer<IS>, session: Session) => Promise<O>
): Procedure<N, IS, O> {
  return { path, inputSchema, handlerForSession };
}
