import { DefaultLogger, Logger } from '../shared/Logger';
import { Transport, TransportToken } from './Transport';
import { MessageListener } from './MessageListener';
import { MessageSender } from './MessageSender';
import { Tokens, TokensOptions } from './Throttler/Tokens';
import { MessageProcessor } from './MessageProcessor';
import { Platform } from '../../../daemon/dist';
import { INVOKE_TIMEOUT } from '../shared/consts';
import { ClientRouter } from './ClientRouter';
import { RunService } from '@rbxts/services';

export interface ServerAgentOptions {
  url: string;
  room?: string | undefined;
  isStudioEditMode?: boolean;
  token: TransportToken;
  logger?: Logger;
  throttlerTokensOptions?: TokensOptions;
  maxBatchSize?: number;
  preferLongPolling?: boolean;
}

export class ServerAgent {
  public readonly url: string;
  public readonly room?: string | undefined;
  public readonly isStudioEditMode: boolean;
  public readonly preferLongPolling: boolean;
  public readonly platforms: Platform[];

  public readonly logger: Logger;
  public readonly transport: Transport;
  public readonly throttlerTokens: Tokens;
  public readonly messageProcessor: MessageProcessor;
  public readonly messageListener: MessageListener;
  public readonly messageSender: MessageSender;
  public readonly clientRouter: ClientRouter;

  constructor(options: ServerAgentOptions) {
    this.url = options.url;
    this.room = options.room;
    this.logger = options.logger ?? DefaultLogger;
    this.isStudioEditMode = options.isStudioEditMode ?? false;
    this.preferLongPolling = options.preferLongPolling ?? false;
    this.platforms = RunService.IsStudio()
      ? this.isStudioEditMode
        ? ['STUDIO_EDIT']
        : ['STUDIO_CLIENT', 'STUDIO_SERVER']
      : ['GAMESERVER_CLIENT', 'GAMESERVER_SERVER'];

    this.transport = new Transport(this, options.token);
    this.throttlerTokens = new Tokens(options.throttlerTokensOptions);
    this.messageProcessor = new MessageProcessor(this);
    this.messageListener = new MessageListener(this);
    this.messageSender = new MessageSender(this, options.maxBatchSize);
    this.clientRouter = new ClientRouter(this);
  }

  fire(messageType: string, platforms: Platform[], content: string) {
    this.messageSender.fire(messageType, platforms, content);
  }

  invoke(messageType: string, platform: Platform, content: string): Promise<string> {
    const messageId = this.messageSender.fire(messageType, [platform], content);
    return new Promise((resolve, reject) => {
      let timeout: thread | undefined = task.delay(INVOKE_TIMEOUT, () => {
        timeout = undefined;
        unbind();
        reject('Timeout waiting for response');
      });
      const unbind = this.messageProcessor.bindToReply(messageId, (message) => {
        if (timeout !== undefined) {
          task.cancel(timeout);
          timeout = undefined;
          resolve(message.content);
        }
      });
    });
  }

  bind(messageType: string, callback: (content: string, reply: (content: string) => void) => void) {
    const platform: Platform = this.isStudioEditMode ? 'STUDIO_EDIT' : 'STUDIO_SERVER';
    return this.messageProcessor.bind(platform, messageType, (message) => {
      callback(message.content, (content) => {
        this.messageSender.fireReply(message.id, content);
      });
    });
  }

  destroy() {
    this.messageListener.destroy();
    this.clientRouter.destroy();
  }
}
