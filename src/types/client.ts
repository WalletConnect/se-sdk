import EventEmmiter, { EventEmitter } from "events";
import { CoreTypes, ICore, Verify, AuthTypes } from "@walletconnect/types";
import { ISingleEthereumEngine } from "./engine";
import { Logger } from "@walletconnect/logger";
import { AuthEngineTypes } from "@walletconnect/auth-client";
import { Web3WalletTypes } from "@walletconnect/web3wallet";

export declare namespace SingleEthereumTypes {
  type Event =
    | "session_proposal"
    | "session_proposal_error"
    | "session_request"
    | "session_delete"
    | "auth_request"
    | "session_authenticate";

  interface BaseEventArgs<T = unknown> {
    id: number;
    topic: string;
    params: T;
  }

  type SessionRequest = BaseEventArgs<{
    request: { method: string; params: unknown };
    chainId: string;
  }> & {
    verifyContext: Verify.Context;
  };

  type SessionProposal = Web3WalletTypes.SessionProposal;

  type SessionDelete = Omit<BaseEventArgs, "params">;

  type AuthRequest = Web3WalletTypes.AuthRequest;

  type SessionProposalError = {
    message: string;
    code: number;
  };

  type SessionAuthenticate = BaseEventArgs<AuthTypes.AuthRequestEventArgs>;
  interface EventArguments {
    session_proposal: SessionProposal;
    session_proposal_error: SessionProposalError;
    session_request: SessionRequest;
    session_delete: SessionDelete;
    auth_request: AuthRequest;
    session_authenticate: SessionAuthenticate;
  }

  type CacaoRequestPayload = AuthEngineTypes.CacaoRequestPayload;
  type PendingAuthRequest = AuthEngineTypes.PendingRequest;

  interface Options {
    core: ICore;
    metadata: Metadata;
    name?: string;
  }

  type Metadata = CoreTypes.Metadata;
}

export abstract class ISingleEthereumEvents extends EventEmmiter {
  constructor() {
    super();
  }

  public abstract emit: <E extends SingleEthereumTypes.Event>(
    event: E,
    args: SingleEthereumTypes.EventArguments[E],
  ) => boolean;

  public abstract on: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any,
  ) => this;

  public abstract once: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any,
  ) => this;

  public abstract off: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any,
  ) => this;

  public abstract removeListener: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any,
  ) => this;
}

export abstract class ISingleEthereum {
  public abstract readonly name: string;
  public abstract engine: ISingleEthereumEngine;
  public abstract events: EventEmitter;
  public abstract logger: Logger;
  public abstract core: ICore;
  public abstract metadata: SingleEthereumTypes.Metadata;

  constructor(public opts: SingleEthereumTypes.Options) {}

  // ---------- Public Methods ----------------------------------------------- //

  public abstract pair: ISingleEthereumEngine["pair"];

  // sign //
  public abstract approveSession: ISingleEthereumEngine["approveSession"];
  public abstract rejectSession: ISingleEthereumEngine["rejectSession"];
  public abstract updateSession: ISingleEthereumEngine["updateSession"];
  public abstract approveRequest: ISingleEthereumEngine["approveRequest"];
  public abstract rejectRequest: ISingleEthereumEngine["rejectRequest"];
  public abstract disconnectSession: ISingleEthereumEngine["disconnectSession"];
  public abstract getActiveSessions: ISingleEthereumEngine["getActiveSessions"];
  public abstract getPendingSessionProposals: ISingleEthereumEngine["getPendingSessionProposals"];
  public abstract getPendingSessionRequests: ISingleEthereumEngine["getPendingSessionRequests"];

  // auth //
  public abstract formatAuthMessage: ISingleEthereumEngine["formatAuthMessage"];
  public abstract approveAuthRequest: ISingleEthereumEngine["approveAuthRequest"];
  public abstract rejectAuthRequest: ISingleEthereumEngine["rejectAuthRequest"];
  public abstract getPendingAuthRequests: ISingleEthereumEngine["getPendingAuthRequests"];

  // multi chain auth //
  public abstract approveSessionAuthenticate: ISingleEthereumEngine["approveSessionAuthenticate"];
  public abstract rejectSessionAuthenticate: ISingleEthereumEngine["rejectSessionAuthenticate"];

  // ---------- Event Handlers ----------------------------------------------- //
  public abstract on: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract once: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract off: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract removeListener: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void,
  ) => EventEmitter;
}
