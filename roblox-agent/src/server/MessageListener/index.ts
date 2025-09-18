import { RunService } from '@rbxts/services';
import { ServerAgent } from '..';
import { MessageProcessor } from '../MessageProcessor';
import { Transport } from '../Transport';
import { MessagePoller } from './MessagePoller';
import { WebStreamListener } from './WebStreamListener';
import { Logger } from '../../shared/Logger';

export class MessageListener {
  public readonly transport: Transport;
  public readonly processor: MessageProcessor;
  public readonly logger: Logger;

  public readonly webStreamListener: WebStreamListener | undefined;
  public readonly poller: MessagePoller | undefined;

  constructor(public readonly agent: ServerAgent) {
    this.transport = agent.transport;
    this.processor = agent.messageProcessor;
    this.logger = agent.logger;

    if (RunService.IsStudio() && !agent.preferLongPolling) {
      this.webStreamListener = new WebStreamListener(this);
    } else {
      this.poller = new MessagePoller(this);
    }
  }

  destroy() {
    if (this.webStreamListener) {
      this.webStreamListener.destroy();
    }
    if (this.poller) {
      this.poller.destroy();
    }
  }
}
