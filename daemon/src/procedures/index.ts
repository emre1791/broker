import { Procedure } from '../types/Procedure';
import { AuthLogin } from './AuthLogin';
import { MessagesPoll } from './MessagesPoll';
import { MessagesPush } from './MessagesPush';

export const procedures: Procedure[] = [AuthLogin, MessagesPoll, MessagesPush];
