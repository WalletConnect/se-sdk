import { ErrorResponse, JsonRpcResponse } from "@walletconnect/jsonrpc-utils";
import {
  ISignClient,
  PendingRequestTypes,
  ProposalTypes,
  SessionTypes,
} from "@walletconnect/types";
import { ISingleEthereum } from "./client";

export abstract class ISingleEthereumEngine {
  public abstract signClient: ISignClient;

  constructor(public client: ISingleEthereum) {}
  // ---------- Public Methods ------------------------------------------------- //
  public abstract init(): Promise<void>;

  public abstract pair(params: {
    uri: string;
    activatePairing?: boolean;
  }): Promise<void>;

  // ---------- Sign ------------------------------------------------- //
  // approve a session proposal (SIGN)
  public abstract approveSession(params: {
    id: number;
    namespaces: Record<string, SessionTypes.Namespace>;
    relayProtocol?: string;
  }): Promise<SessionTypes.Struct>;

  // reject a session proposal (SIGN)
  public abstract rejectSession(params: {
    // proposerPublicKey: string;
    id: number;
    reason: ErrorResponse;
  }): Promise<void>;

  // update session namespaces (SIGN)
  public abstract updateSession(params: {
    topic: string;
    namespaces: SessionTypes.Namespaces;
  }): Promise<void>;

  // update session expiry (SIGN)
  public abstract extendSession(params: { topic: string }): Promise<void>;

  // respond JSON-RPC request (SIGN)
  public abstract respondSessionRequest(params: {
    topic: string;
    response: JsonRpcResponse;
  }): Promise<void>;

  // emit session events (SIGN)
  public abstract emitSessionEvent(params: {
    topic: string;
    event: any; //SessionEvent;
    chainId: string;
  }): Promise<void>;

  // disconnect a session (SIGN)
  public abstract disconnectSession(params: {
    topic: string;
    reason: ErrorResponse;
  }): Promise<void>;

  // query all active sessions (SIGN)
  public abstract getActiveSessions(): Record<string, SessionTypes.Struct>;

  // query all pending session requests (SIGN)
  public abstract getPendingSessionProposals(): Record<
    number,
    ProposalTypes.Struct
  >;

  // query all pending session requests (SIGN)
  public abstract getPendingSessionRequests(): PendingRequestTypes.Struct[];
}
