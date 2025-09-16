import z from 'zod';
import { createApiTokenProcedure } from '../types/Procedure';
import { sessionById } from '../registry/registry';

export interface AuthValidateResponse {
  valid: boolean;
}

export const AuthValidateRequest = z.object({
  sessionId: z.uuid({ version: 'v4' }),
});

export const AuthValidate = createApiTokenProcedure(
  '/auth/validate',
  AuthValidateRequest,
  async (input): Promise<AuthValidateResponse> => {
    const session = sessionById.get(input.sessionId);
    return { valid: session !== undefined && !session.isTimedOut() };
  }
);
