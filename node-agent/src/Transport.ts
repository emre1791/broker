import axios from 'axios';
import { ProcedureInputs, ProcedureOutputs, ProcedureName } from '../../daemon/src';
import { Logger } from './Logger';
import { Client } from './Client';

export class Transport {
  public readonly room: string | undefined;
  public readonly baseUrl: string;
  public readonly token: string;

  public readonly logger: Logger;

  private sessionId: string | undefined;

  constructor(public readonly client: Client) {
    this.room = client.room;
    this.baseUrl = client.baseUrl;
    this.token = client.token;
    this.logger = client.logger;
  }

  private async obtainSession() {
    const result = await this.tokenRequest('/auth/login', {
      acceptPlatforms: ['NODE'],
      room: this.room,
    });
    this.sessionId = result.sessionId;
    this.logger.verbose(`Obtained session ${this.sessionId}`);
    return result.sessionId;
  }

  async fetchSessionId(): Promise<string> {
    if (this.sessionId) {
      const response = await this.tokenRequest('/auth/validate', { sessionId: this.sessionId });
      if (response.valid) {
        return this.sessionId;
      }
    }

    return this.obtainSession();
  }

  async sessionRequest<N extends ProcedureName>(
    path: N,
    input: ProcedureInputs[N]
  ): Promise<ProcedureOutputs[N]> {
    if (!this.sessionId) {
      this.sessionId = await this.obtainSession();
    }
    return this.requestWithSession<ProcedureOutputs[N]>(path, this.sessionId, input)
      .then((res) => {
        if (res.status === 403) {
          // session invalid, re-obtain
          this.sessionId = undefined;
          this.logger.verbose('Session invalid, re-obtaining');

          return this.obtainSession()
            .then((sessionId) =>
              this.requestWithSession<ProcedureOutputs[N]>(path, sessionId, input)
            )
            .then((res) => {
              if (res.status === 403) {
                throw new Error('Re-obtained session is also invalid');
              }
              return res.data;
            });
        } else if (res.status < 200 || res.status >= 300) {
          throw new Error(`Request to ${path} failed with status ${res.status}: ${res.statusText}`);
        } else {
          return res.data;
        }
      })
      .catch((err) => {
        this.logError(`SessionRequest to ${path} failed`, err);
        throw err;
      });
  }

  private async requestWithSession<O>(path: string, sessionId: string, data: unknown = {}) {
    return this.requestWithHeaders<O>(path, data, { 'x-session-id': sessionId }).catch((err) => {
      this.logError(`SessionRequest to ${path} failed`, err);
      throw err;
    });
  }

  async tokenRequest<N extends ProcedureName>(
    path: N,
    input: ProcedureInputs[N]
  ): Promise<ProcedureOutputs[N]> {
    return this.requestWithHeaders<ProcedureOutputs[N]>(path, input, {
      'x-api-token': `Bearer ${this.token}`,
    })
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        this.logError(`TokenRequest to ${path} failed`, err);
        throw err;
      });
  }

  private async requestWithHeaders<O>(
    path: string,
    data: unknown = {},
    headers: Record<string, string> = {}
  ) {
    return axios.post<O>(this.baseUrl + path, data, {
      headers,
      validateStatus: (status) => status >= 200 && status < 500,
    });
  }

  private logError(prefix: string, err: unknown) {
    if (err instanceof Error) {
      this.logger.error(`${prefix}: ${err.message}`);
      this.logger.verbose(err.stack || '');
    } else {
      this.logger.error(`${prefix}:`, err);
    }
  }
}
