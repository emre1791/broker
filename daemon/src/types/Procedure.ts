import z from 'zod';
import { type Session } from '../registry/Session';

export type Procedure<I = unknown, O = unknown> = {
  path: string;
  inputSchema: z.ZodType<I>;
} & (
  | { handlerForApiToken(input: I): Promise<O> }
  | { handlerForSession(input: I, session: Session): Promise<O> }
);
