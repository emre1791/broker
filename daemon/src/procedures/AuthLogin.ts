import z from 'zod';
import { Platform } from '../types/Platform';
import { createApiTokenProcedure, Procedure } from '../types/Procedure';
import { Session } from '../registry/Session';

export interface AuthLoginResponse {
  sessionId: string;
}

export const AuthLoginRequest = z.object({
  room: z.string().max(256, 'Room ID must be at most 256 characters').optional(),
  acceptPlatforms: z.array(Platform),
});

export const AuthLogin = createApiTokenProcedure(
  '/auth/login',
  AuthLoginRequest,
  async (input): Promise<AuthLoginResponse> => {
    const session = new Session(input.acceptPlatforms, input.room);
    return { sessionId: session.id };
  }
);
