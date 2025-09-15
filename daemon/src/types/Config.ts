import { z } from 'zod';

export type Config = z.infer<typeof Config>;

export const Config = z.object({
  PORT: z.coerce.number().default(8080),
  TOKEN: z.string().min(1, 'TOKEN required'),
  NO_STARTUP_MESSAGE: z.union([
    z.string().transform((v) => (v == null ? undefined : /^(1|true|yes|on)$/i.test(v))),
    z.boolean().optional(),
  ]),
});
