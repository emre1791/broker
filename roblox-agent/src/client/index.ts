import { t } from '@rbxts/t';
import {
  clientMessageType,
  MESSAGE_INVOKE_REMOTE_NAME,
  MESSAGE_REMOTE_NAME,
  MESSAGE_SUBSCRIBE_REMOTE_NAME,
} from '../shared/consts';
import { getSharedInstance } from '../shared/shared-instances';
import { Message, Platform } from '../../../daemon/dist';

type ClientMessage = t.static<typeof clientMessageType>;

export class ClientAgent {
  private readonly messageRemoteEvent: RemoteEvent;
  private readonly subscribeRemoteEvent: RemoteEvent;
  private readonly invokeRemoteFunction: RemoteFunction;

  private readonly messageCallbacks = new Map<string, ((content: string) => void)[]>();
  private messageCon: RBXScriptConnection;

  constructor() {
    this.messageRemoteEvent = getSharedInstance(MESSAGE_REMOTE_NAME, 'RemoteEvent');
    this.subscribeRemoteEvent = getSharedInstance(MESSAGE_SUBSCRIBE_REMOTE_NAME, 'RemoteEvent');
    this.invokeRemoteFunction = getSharedInstance(MESSAGE_INVOKE_REMOTE_NAME, 'RemoteFunction');

    this.messageCon = this.messageRemoteEvent.OnClientEvent.Connect((message: Message) => {
      const callbacks = this.messageCallbacks.get(message.type);
      if (callbacks) {
        for (const callback of callbacks) {
          callback(message.content);
        }
      }
    });
  }

  fire(messageType: string, platforms: Platform[], content: string) {
    const clientMessage: ClientMessage = { type: messageType, content, platforms };
    this.messageRemoteEvent.FireServer(clientMessage);
  }

  invoke(messageType: string, platform: Platform, content: string): Promise<string> {
    const clientMessage: ClientMessage = { type: messageType, content, platforms: [platform] };
    return new Promise((resolve, reject) => {
      const [success, response] = pcall(() => {
        return this.invokeRemoteFunction.InvokeServer(clientMessage);
      });
      if (success) {
        resolve(response);
      } else {
        reject(response);
      }
    });
  }

  bind(messageType: string, callback: (content: string) => void) {
    let array = this.messageCallbacks.get(messageType);
    if (!array) {
      array = [];
      this.messageCallbacks.set(messageType, array);
      this.subscribeRemoteEvent.FireServer(messageType);
    }
    array.push(callback);
    return () => {
      const index = array.indexOf(callback);
      if (index !== -1) {
        array.remove(index);
      }
    };
  }

  destroy() {
    this.messageCon.Disconnect();
    this.messageCallbacks.clear();
  }
}
