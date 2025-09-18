import { v4 } from 'uuid';
import { Message } from '../types/Message';
import { Platform } from '../types/Platform';
import { SESSION_TIMEOUT } from '../consts';
import { sessionById, sessions } from './registry';
import { Socket } from 'socket.io';
import express from 'express';

interface MessageCallback {
  callback: (messages: Message[]) => void;
  once: boolean;
}

export class Session {
  public readonly id: string = v4();
  public readonly shortId = this.id.substring(0, 8);

  private timeout = Date.now() + SESSION_TIMEOUT;
  private unreadMessages: Message[] = [];
  private messageCallbacks: MessageCallback[] = [];
  private socket: Socket | null = null;
  private streamResponse: express.Response | null = null;

  constructor(public readonly platforms: Platform[], public readonly room: string | undefined) {
    sessions.push(this);
    sessionById.set(this.id, this);
  }

  promiseMessages(timeoutMs: number): Promise<Message[]> {
    return new Promise((resolve) => {
      const callback = (messages: Message[]) => {
        clearTimeout(timeout);
        resolve(messages);
      };
      const timeout = setTimeout(() => {
        this.unbindFromMessages(callback);
        resolve([]);
      }, timeoutMs);
      this.bindToMessages(callback, true);
    });
  }

  bindToMessages(callback: (messages: Message[]) => void, once: boolean = false) {
    const hasMessages = this.unreadMessages.length > 0;
    if (hasMessages) {
      callback(this.unreadMessages.filter(filterTimeout));
    }
    if (!hasMessages || !once) {
      this.messageCallbacks.push({ callback, once });
    }
    return () => this.unbindFromMessages(callback);
  }

  unbindFromMessages(callback: (messages: Message[]) => void) {
    for (let i = 0; i < this.messageCallbacks.length; i++) {
      if (this.messageCallbacks[i].callback === callback) {
        this.messageCallbacks.splice(i, 1);
        break;
      }
    }
  }

  deleteExpiredMessages() {
    this.unreadMessages = this.unreadMessages.filter(filterTimeout);
  }

  getMessages(): Message[] {
    return this.unreadMessages.filter(filterTimeout);
  }

  addMessages(messages: Message[]) {
    const messagesFiltered = messages.filter((message) => {
      return this.canReceive(message) && filterTimeout(message);
    });
    console.log('Session', this.shortId, 'can receive', messagesFiltered.length, 'messages');
    if (messagesFiltered.length === 0) {
      return;
    }
    if (this.messageCallbacks.length > 0) {
      for (let i = 0; i < this.messageCallbacks.length; i++) {
        const callback = this.messageCallbacks[i];
        if (callback.once) {
          this.messageCallbacks.splice(i, 1);
          i--;
        }
        callback.callback(messagesFiltered);
      }
    } else {
      this.unreadMessages.push(...messagesFiltered);
    }
  }

  ackMessages(messageIds: string[]) {
    this.unreadMessages = this.unreadMessages.filter((m) => !messageIds.includes(m.id));
  }

  canReceive(message: Message): boolean {
    if (this.room !== message.room) {
      return false;
    }
    if (this.shortId === message.senderShortId) {
      return false;
    }
    if (!hasOverlappingPlatform(this.platforms, message.platforms)) {
      return false;
    }
    if (this.unreadMessages.find((m) => m.id === message.id)) {
      return false;
    }
    return true;
  }

  addActivity() {
    const newTimeout = Date.now() + SESSION_TIMEOUT;
    if (newTimeout > this.timeout) {
      this.timeout = newTimeout;
    }
  }

  isTimedOut(): boolean {
    return (
      Date.now() > this.timeout &&
      (this.socket === null || !this.socket.connected) &&
      (this.streamResponse === null || this.streamResponse.writableEnded)
    );
  }

  expire() {
    this.timeout = 0;
    if (this.socket) {
      this.socket.disconnect(true);
      this.socket = null;
    }
  }

  setSocket(socket: Socket | null) {
    if (this.socket && this.socket !== socket) {
      this.socket.disconnect(true);
    }
    this.socket = socket;
  }

  setStreamResponse(streamResponse: express.Response | null) {
    if (this.streamResponse && this.streamResponse !== streamResponse) {
      this.streamResponse.end();
    }
    this.streamResponse = streamResponse;
  }
}

function filterTimeout(message: Message): boolean {
  return message.timeout > Date.now();
}

function hasOverlappingPlatform(a: Platform[], b: Platform[]): boolean {
  for (const platform of a) {
    if (b.includes(platform)) {
      return true;
    }
  }
  return false;
}
