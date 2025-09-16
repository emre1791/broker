import z from 'zod';
import { Procedure } from '../types/Procedure';
import { AuthLogin } from './AuthLogin';
import { MessagesPoll } from './MessagesPoll';
import { MessagesPush } from './MessagesPush';

type MapProcedureInputs<T extends readonly Procedure[]> = {
  [P in T[number] as P['path']]: z.infer<P['inputSchema']>;
};

type MapProcedureOutputs<T extends readonly Procedure[]> = {
  [P in T[number] as P['path']]: P extends Procedure<infer _N, infer _IS, infer O> ? O : never;
};

export type ProcedureInputs = MapProcedureInputs<typeof procedures>;
export type ProcedureOutputs = MapProcedureOutputs<typeof procedures>;

export const procedures = [AuthLogin, MessagesPoll, MessagesPush] as const satisfies Procedure[];
