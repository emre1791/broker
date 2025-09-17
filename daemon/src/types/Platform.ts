import z from 'zod';

export type Platform = z.infer<typeof Platform>;

export const Platform = z.enum([
  'UNKNOWN',
  'NODE',
  'STUDIO_EDIT',
  'STUDIO_SERVER',
  'STUDIO_CLIENT',
  'GAMESERVER_SERVER',
  'GAMESERVER_CLIENT',
]);
