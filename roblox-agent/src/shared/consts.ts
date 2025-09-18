import { t } from '@rbxts/t';
import { Platform } from '../../../daemon/dist';

export const INVOKE_TIMEOUT = 5;
export const MESSAGE_REPLY_TYPE = 'SYSTEM_MESSAGE_REPLY';

export const MESSAGE_REMOTE_NAME = 'Message';
export const MESSAGE_INVOKE_REMOTE_NAME = 'MessageInvoke';
export const MESSAGE_SUBSCRIBE_REMOTE_NAME = 'MessageSubscribe';

export const ALL_PLATFORMS: Platform[] = [
  'UNKNOWN',
  'NODE',
  'STUDIO_EDIT',
  'STUDIO_CLIENT',
  'STUDIO_SERVER',
  'GAMESERVER_CLIENT',
  'GAMESERVER_SERVER',
];
export const clientMessageType = t.strictInterface({
  type: t.string,
  platforms: t.array(t.literalList(ALL_PLATFORMS)),
  content: t.string,
});
