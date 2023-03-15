# @walletconnect/se-sdk

## API Interface

```javascript
class ClientLV {
  public init(params: { core: CoreClient }): Promise<void>;

  public pair(params: { uri: string }): Promise<void>;

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


  // ---------- Events ----------------------------------------------- //

  public on("session_proposal", (sessionProposal: SessionProposal) => {}): void;

  public on("session_request", (sessionRequest: SessionRequest) => {}): void;

  public on("session_delete", (sessionDelete: { id: number, topic: string }) => {}): void;
}
```
