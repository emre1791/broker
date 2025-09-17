import z from 'zod';
import express from 'express';

const header = z.string().min(1).max(1024);

export const getHeader = (req: express.Request, name: string) => {
  const value = req.headers[name];
  const parseResult = header.safeParse(value);
  return parseResult.success ? parseResult.data : undefined;
};
