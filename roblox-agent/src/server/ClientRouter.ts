import { t } from '@rbxts/t';
import { ServerAgent } from '.';
import {
  clientMessageType,
  INVOKE_TIMEOUT,
  MESSAGE_INVOKE_REMOTE_NAME,
  MESSAGE_REMOTE_NAME,
  MESSAGE_SUBSCRIBE_REMOTE_NAME,
} from '../shared/consts';
import { getSharedInstance } from '../shared/shared-instances';
import { MessageProcessor } from './MessageProcessor';
import { Message, Platform } from '../../../daemon/dist';
import { RunService } from '@rbxts/services';

export class ClientRouter {
  public readonly messageProcessor: MessageProcessor;

  private readonly messageRemoteEvent: RemoteEvent;
  private incomingMessageCon: RBXScriptConnection;
  private subscribeCon: RBXScriptConnection;
  private readonly unsubscribeFns = new Map<Player, Callback>();
  private readonly pendingPromises = new Set<Promise<string>>();

  constructor(public readonly agent: ServerAgent) {
    this.messageProcessor = agent.messageProcessor;

    this.messageRemoteEvent = getSharedInstance(MESSAGE_REMOTE_NAME, 'RemoteEvent');
    this.incomingMessageCon = this.messageRemoteEvent.OnServerEvent.Connect(
      (_player, clientMessage) => {
        assert(clientMessageType(clientMessage), 'Received invalid message from client');
        this.sendClientMessage(clientMessage);
      }
    );

    const subscribeRemote = getSharedInstance(MESSAGE_SUBSCRIBE_REMOTE_NAME, 'RemoteEvent');
    this.subscribeCon = subscribeRemote.OnServerEvent.Connect((player, messageType) => {
      assert(t.string(messageType), 'Received invalid subscribe request from client');

      const playerLeaveCon = player.AncestryChanged.Connect(() => {
        if (!player.IsDescendantOf(game)) {
          unsubscribe();
        }
      });

      const platform: Platform = RunService.IsStudio() ? 'STUDIO_CLIENT' : 'GAMESERVER_CLIENT';
      const unbind = this.messageProcessor.bind(platform, messageType, (message: Message) => {
        this.messageRemoteEvent.FireClient(player, message);
      });

      const unsubscribe = () => {
        playerLeaveCon.Disconnect();
        unbind();
      };
      this.unsubscribeFns.set(player, unsubscribe);
    });

    const messageRemoteFn = getSharedInstance(MESSAGE_INVOKE_REMOTE_NAME, 'RemoteFunction');
    messageRemoteFn.OnServerInvoke = (_player, clientMessage) => {
      assert(clientMessageType(clientMessage), 'Received invalid message from client');

      const messageId = this.sendClientMessage(clientMessage);
      let unbind: Callback;

      const promise = new Promise<string>((resolve, reject) => {
        let timeout: thread | undefined = task.delay(INVOKE_TIMEOUT, () => {
          timeout = undefined;
          reject('Timeout waiting for response');
        });
        unbind = this.messageProcessor.bindToReply(messageId, (message) => {
          if (timeout !== undefined) {
            task.cancel(timeout);
            timeout = undefined;
            resolve(message.content);
          }
        });
      });

      this.pendingPromises.add(promise);
      promise.finally(() => {
        unbind();
        this.pendingPromises.delete(promise);
      });

      return promise.expect();
    };
  }

  private sendClientMessage(clientMessage: t.static<typeof clientMessageType>) {
    const id = this.agent.messageSender.fire(
      clientMessage.type,
      clientMessage.platforms,
      clientMessage.content
    );
    return id;
  }

  destroy() {
    this.incomingMessageCon.Disconnect();
    this.subscribeCon.Disconnect();
    this.unsubscribeFns.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeFns.clear();
    this.pendingPromises.forEach((promise) => promise.cancel());
  }
}
