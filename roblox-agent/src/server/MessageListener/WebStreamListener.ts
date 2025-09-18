import { base64_to_bin } from '@rbxts/hashlib';
import { MessageListener } from '.';
import { Transport } from '../Transport';
import { MessageProcessor } from '../MessageProcessor';
import { Logger } from '../../shared/Logger';
import { Message } from '../../../../daemon/dist';
import { HttpService } from '@rbxts/services';

export class WebStreamListener {
  public readonly transport: Transport;
  public readonly processor: MessageProcessor;
  public readonly logger: Logger;

  private webStreamClient: WebStreamClient | undefined;

  constructor(public readonly listener: MessageListener) {
    this.transport = listener.transport;
    this.processor = listener.processor;
    this.logger = listener.logger;

    this.start();
  }

  private onSSE(raw: string) {
    if (raw.sub(0, 6) === 'data: ') {
      const base64str = raw.sub(7, -2);
      const msgstr = base64_to_bin(base64str);
      const message = HttpService.JSONDecode(msgstr) as Message;
      this.processor.processMessages([message]);
    }
  }

  async start() {
    if (this.webStreamClient) {
      return;
    }
    this.webStreamClient = await this.transport.createWebStreamClient('/messages/stream');
    this.webStreamClient.MessageReceived.Connect((message) => {
      this.onSSE(message);
    });
    this.webStreamClient.Opened.Connect((statusCode) => {
      this.logger.verbose('WebStream opened with status code:', statusCode);
    });
    this.webStreamClient.Error.Connect((err) => {
      this.logger.error('WebStream error:', err);
    });
  }

  destroy() {
    if (this.webStreamClient) {
      this.webStreamClient.Close();
      this.webStreamClient = undefined;
    }
  }
}
