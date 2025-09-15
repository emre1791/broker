import { Message } from '../types/Message';
import { Session } from './Session';

export const messages: Message[] = [];
export const sessions: Session[] = [];
export const sessionById = new Map<string, Session>();
