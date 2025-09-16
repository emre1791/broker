import { Message } from '../../../daemon/src';
import { AckStore } from './AckStore';
import { NodeAgent } from '.';
import { MESSAGE_REPLY_TYPE } from '../consts';
import { Logger } from '../Logger';

type MessageCallback = (message: Message) => void;

export class MessageProcessor {
  public readonly logger: Logger;
  public readonly ackStore: AckStore;

  private readonly bindings = new Map<string, Array<MessageCallback>>();

  constructor(public readonly agent: NodeAgent) {
    this.logger = agent.logger;
    this.ackStore = agent.ackStore;
  }

  processMessages(messages: Message[]) {
    for (const message of messages) {
      if (this.ackStore.isDuplicate(message)) {
        continue;
      }
      const callbacks = this.bindings.get(message.type);
      if (callbacks) {
        for (const callback of callbacks) {
          try {
            callback(message);
          } catch (err) {
            this.logger.error(`Error in "${message.type}" message callback`, err);
          }
        }
      }
      this.ackStore.addMessage(message);
    }
  }

  bindToReply(messageId: string, callback: MessageCallback) {
    return this.bind(MESSAGE_REPLY_TYPE, (message) => {
      if (message.replyingMessageId === messageId) {
        this.unbind(MESSAGE_REPLY_TYPE, callback);
        callback(message);
      }
    });
  }

  bind(type: string, callback: MessageCallback) {
    let array = this.bindings.get(type);
    if (!array) {
      array = [];
      this.bindings.set(type, array);
    }
    if (!array.includes(callback)) {
      array.push(callback);
    }
    return () => this.unbind(type, callback);
  }

  unbind(type: string, callback: MessageCallback) {
    const array = this.bindings.get(type);
    if (array) {
      const index = array.indexOf(callback);
      if (index !== -1) {
        array.splice(index, 1);
      }
    }
  }
}
