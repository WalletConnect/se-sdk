# @walletconnect/se-sdk

## API Interface

```javascript
class ClientLV {
  public init(params: { core: CoreClient }): Promise<void>;

  public pair(params: { uri: string }): Promise<void>;

  // ----------------- Sign ----------------- //

  public approveSession(params: {
    id: number;
    chainId: number;
    accounts: string[];
  }): Promise<Session>;

  public rejectSession(params: {
    id: number;
    error: {
  	  message: "OPTIONAL_ERROR_MESSAGE"
    }
  }): Promise<void>;

  public updateSession(params: {
    topic: string;
    chainId: number;
    accounts: string[];
  }): Promise<void>;

  public approveRequest(params: {
    topic: string;
    id: number,
    result: any,
  }): void;

  public rejectRequest(params: {
    topic: string;
    id: number,
    error: {
      message: "OPTIONAL_ERROR_MESSAGE"
    }
  }): void;


  public disconnectSession(params: {
    topic: string;
    error: {
      message: "OPTIONAL_ERROR_MESSAGE"
    }
  }): Promise<void>;

  public getActiveSessions(): Promise<Record<string, Session>>;

  public getPendingSessionProposals(): Promise<Record<number, SessionProposal>>;

  public getPendingSessionRequests(): Promise<Record<number, SessionRequest>>;

  // ----------------- Auth ----------------- //

 public approveAuthRequest(params: {
    id: number;
    signature: string;
    address: string;
  }): Promise<void>;

  public rejectAuthRequest(params: { id: number; error: ErrorResponse }): Promise<void>;

 public formatAuthMessage(
    payload: SingleEthereumTypes.CacaoRequestPayload,
    address: string,
  ): string;

  public getPendingAuthRequests(): Record<number, SingleEthereumTypes.PendingAuthRequest>;

  // ----------------- Events ----------------- //

  public on("session_proposal", (sessionProposal: SessionProposal) => {}): void;

  public on("session_request", (sessionRequest: SessionRequest) => {}): void;

  public on("session_delete", (sessionDelete: {
    id: number,
    topic: string
  }) => {}): void;

  public on("auth_request", (params: {
    id: number,
    topic: string,
    params: {
      requester: AuthEngineTypes.PendingRequest["requester"], cacaoPayload: AuthEngineTypes.CacaoRequestPayload
    }
  }) => {}): void;

}
```
