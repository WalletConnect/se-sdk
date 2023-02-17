import EventEmmiter, { EventEmitter } from "events";
import { CoreTypes, ICore, ProposalTypes } from "@walletconnect/types";
import { ISingleEthereumEngine } from "./engine";
import { Logger } from "@walletconnect/logger";

export declare namespace SingleEthereumTypes {
  type Event = "session_proposal" | "session_request" | "session_delete";

  interface BaseEventArgs<T = unknown> {
    id: number;
    topic: string;
    params: T;
  }

  type SessionRequest = BaseEventArgs<{
    request: { method: string; params: any };
    chainId: string;
  }>;

  type SessionProposal = Omit<BaseEventArgs<ProposalTypes.Struct>, "topic">;

  type SessionDelete = Omit<BaseEventArgs, "params">;

  interface EventArguments {
    session_proposal: Omit<BaseEventArgs<ProposalTypes.Struct>, "topic">;
    session_request: SessionRequest;
    session_delete: Omit<BaseEventArgs, "params">;
  }

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
    args: SingleEthereumTypes.EventArguments[E]
  ) => boolean;

  public abstract on: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any
  ) => this;

  public abstract once: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any
  ) => this;

  public abstract off: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any
  ) => this;

  public abstract removeListener: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any
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

  // ---------- Event Handlers ----------------------------------------------- //
  public abstract on: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void
  ) => EventEmitter;

  public abstract once: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void
  ) => EventEmitter;

  public abstract off: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void
  ) => EventEmitter;

  public abstract removeListener: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void
  ) => EventEmitter;
}
