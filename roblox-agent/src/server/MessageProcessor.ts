import { ServerAgent } from '.';
import { Message, Platform } from '../../../daemon/dist';
import { MESSAGE_REPLY_TYPE } from '../shared/consts';
import { Logger } from '../shared/Logger';

type MessageCallback = (message: Message) => void;
type MessageBinding = {
  platform: Platform;
  callback: MessageCallback;
};

export class MessageProcessor {
  public readonly logger: Logger;

  private readonly bindings = new Map<string, Array<MessageBinding>>();

  constructor(public readonly agent: ServerAgent) {
    this.logger = agent.logger;
  }

  processMessages(messages: Message[]) {
    for (const message of messages) {
      const callbacks = this.bindings.get(message.type);
      if (callbacks === undefined) {
        continue;
      }
      for (const binding of callbacks) {
        if (binding.platform !== 'UNKNOWN' && !message.platforms.includes(binding.platform)) {
          continue;
        }

        try {
          binding.callback(message);
        } catch (err) {
          this.logger.error(`Error in "${message.type}" message callback`, err);
        }
      }
    }
  }

  bindToReply(messageId: string, callback: MessageCallback) {
    return this.bind('UNKNOWN', MESSAGE_REPLY_TYPE, (message) => {
      if (message.replyingMessageId === messageId) {
        this.unbind(MESSAGE_REPLY_TYPE, callback);
        callback(message);
      }
    });
  }

  bind(platform: Platform, messageType: string, callback: MessageCallback) {
    let array = this.bindings.get(messageType);
    if (!array) {
      array = [];
      this.bindings.set(messageType, array);
    }
    if (!array.some((binding) => binding.callback === callback)) {
      array.push({ platform: platform, callback });
    }
    return () => this.unbind(messageType, callback);
  }

  unbind(messageType: string, callback: MessageCallback) {
    const array = this.bindings.get(messageType);
    if (array) {
      const index = array.findIndex((binding) => binding.callback === callback);
      if (index !== -1) {
        array.remove(index);
      }
    }
  }
}
