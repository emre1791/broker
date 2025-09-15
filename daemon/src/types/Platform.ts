import z from 'zod';

export type Platform = z.infer<typeof Platform>;

export const Platform = z.enum([
  'NODE',
  'STUDIO_EDIT',
  'STUDIO_SERVER',
  'STUDIO_CLIENT',
  'GAMESERVER_SERVER',
  'GAMESERVER_CLIENT',
]);
