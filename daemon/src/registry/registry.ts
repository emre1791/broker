import { Message } from '../types/Message';
import { Session } from './Session';

export const messages: Message[] = [];
export const messageById = new Map<string, Message>();
export const sessions: Session[] = [];
export const sessionById = new Map<string, Session>();
