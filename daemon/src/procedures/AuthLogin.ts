import z from 'zod';
import { Platform } from '../types/Platform';
import { Procedure } from '../types/Procedure';
import { Session } from '../registry/Session';

export interface AuthLoginResponse {
  sessionId: string;
}

export const AuthLoginRequest = z.object({
  room: z.string().max(256, 'Room ID must be at most 256 characters').optional(),
  acceptPlatforms: z.array(Platform),
});

export const AuthLogin: Procedure<z.infer<typeof AuthLoginRequest>, AuthLoginResponse> = {
  path: '/auth/login',
  inputSchema: AuthLoginRequest,
  async handlerForApiToken(input) {
    const session = new Session(input.acceptPlatforms, input.room);
    return { sessionId: session.id };
  },
};
