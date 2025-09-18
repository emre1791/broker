import { HttpService, RunService } from '@rbxts/services';
import { ServerAgent } from '.';
import { Platform, ProcedureInputs, ProcedureName, ProcedureOutputs } from '../../../daemon/dist';
import { Logger } from '../shared/Logger';

export interface TransportToken {
  type: 'RAW' | 'HttpServiceSecret';
  value: string;
}

export class Transport {
  public readonly room: string | undefined;

  public readonly logger: Logger;

  private sessionId: string | undefined;

  constructor(public readonly agent: ServerAgent, public readonly token: TransportToken) {
    this.room = agent.room;
    this.logger = agent.logger;
  }

  async createWebStreamClient(path: string): Promise<WebStreamClient> {
    const sessionId = await this.fetchSessionId();
    const options: RequestAsyncRequest = {
      Url: this.agent.url + path,
      Method: 'GET',
      Headers: { 'x-session-id': sessionId },
    };
    return HttpService.CreateWebStreamClient(Enum.WebStreamClientType.SSE, options);
  }

  private getTokenHeader(): Secret | string {
    if (this.token.type === 'RAW') {
      return this.token.value;
    } else {
      return HttpService.GetSecret(this.token.value);
    }
  }

  private async obtainSession() {
    const platforms: Platform[] = this.agent.isStudioEditMode
      ? ['STUDIO_EDIT']
      : ['STUDIO_SERVER', 'STUDIO_CLIENT'];
    const result = await this.tokenRequest('/auth/login', {
      acceptPlatforms: platforms,
      room: this.room,
    });
    this.sessionId = result.sessionId;
    this.logger.verbose(`Obtained session ${this.sessionId}`);
    return result.sessionId;
  }

  getShortId(): string {
    return this.sessionId === undefined ? '' : this.sessionId.sub(0, 8);
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
    return this.requestWithSession<N>(path, this.sessionId, input)
      .then((res) => {
        if (res.StatusCode === 403) {
          // session invalid, re-obtain
          this.sessionId = undefined;
          this.logger.verbose('Session invalid, re-obtaining');

          return this.obtainSession()
            .then((sessionId) => this.requestWithSession<N>(path, sessionId, input))
            .then((res) => {
              if (res.StatusCode === 403) {
                throw 'Re-obtained session is also invalid';
              }
              return this.parseResponse<N>(res);
            });
        } else if (res.StatusCode < 200 || res.StatusCode >= 300) {
          throw `Request to ${path} failed with status ${res.StatusCode}: ${res.StatusMessage}`;
        } else {
          return this.parseResponse<N>(res);
        }
      })
      .catch((err) => {
        this.logger.error(`SessionRequest to ${path} failed`, err);
        throw err;
      });
  }

  private async requestWithSession<N extends ProcedureName>(
    path: N,
    sessionId: string,
    data: ProcedureInputs[N]
  ) {
    return this.request<N>(path, data, { 'x-session-id': sessionId }).catch((err) => {
      this.logger.error(`SessionRequest to ${path} failed`, err);
      throw err;
    });
  }

  async tokenRequest<N extends ProcedureName>(
    path: N,
    body: ProcedureInputs[N]
  ): Promise<ProcedureOutputs[N]> {
    return this.request<N>(path, body, { ['x-api-token']: this.getTokenHeader() }).then((res) =>
      this.parseResponse<N>(res)
    );
  }

  private async request<N extends ProcedureName>(
    path: N,
    body: ProcedureInputs[N],
    headers: Record<string, Secret | string> = {}
  ): Promise<RequestAsyncResponse> {
    const rawBody = HttpService.JSONEncode(body);
    const response = HttpService.RequestAsync({
      Url: this.agent.url + path,
      Method: 'POST',
      Body: rawBody,
      Headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    return response;
  }

  private parseResponse<N extends ProcedureName>(
    response: RequestAsyncResponse
  ): ProcedureOutputs[N] {
    if (response.Success && response.StatusCode === 200) {
      const responseBody = response.Body === '' ? undefined : HttpService.JSONDecode(response.Body);
      return responseBody as ProcedureOutputs[N];
    } else {
      throw `Request failed: ${response.StatusCode} - ${response.StatusMessage}`;
    }
  }
}
