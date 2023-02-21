import {
  formatJsonRpcError,
  formatJsonRpcResult,
} from "@walletconnect/jsonrpc-utils";
import { SignClient } from "@walletconnect/sign-client";
import { ISignClient } from "@walletconnect/types";
import { getSdkError } from "@walletconnect/utils";
import { EVM_IDENTIFIER } from "../constants";
import { ISingleEthereumEngine, SingleEthereumTypes } from "../types";
import {
  validateProposalNamespaces,
  validateProposalChains,
  chainAlreadyInSession,
  formatAccounts,
  prefixChainWithNamespace,
  parseChain,
  parseSessions,
  parseProposals,
  parseProposal,
  accountsAlreadyInSession,
} from "../utils";

export class Engine extends ISingleEthereumEngine {
  public signClient: ISignClient;
  public chainId?: number;

  constructor(client: ISingleEthereumEngine["client"]) {
    super(client);
    // initialized in init()
    this.signClient = {} as any;
  }

  public init = async () => {
    this.signClient = await SignClient.init({
      core: this.client.core,
      metadata: this.client.metadata,
    });

    this.initializeEventListeners();
  };

  public pair: ISingleEthereumEngine["pair"] = async (params) => {
    await this.client.core.pairing.pair(params);
  };

  public approveSession: ISingleEthereumEngine["approveSession"] = async (
    params
  ) => {
    const { id, chainId, accounts } = params;
    const proposal = this.signClient.proposal.get(id);
    const approveParams = {
      id,
      namespaces: {
        [EVM_IDENTIFIER]: {
          ...proposal.requiredNamespaces[EVM_IDENTIFIER],
          accounts: formatAccounts(accounts, chainId),
          chains: [prefixChainWithNamespace(chainId)],
        },
      },
    };

    const { topic, acknowledged } = await this.signClient.approve(
      approveParams
    );
    await acknowledged();

    this.chainId = chainId;

    return this.signClient.session.get(topic);
  };

  public rejectSession: ISingleEthereumEngine["rejectSession"] = async (
    params
  ) => {
    return await this.signClient.reject({
      id: params.id,
      reason: params.error,
    });
  };

  public updateSession: ISingleEthereumEngine["updateSession"] = async (
    params
  ) => {
    const { topic, chainId, accounts } = params;
    const session = this.signClient.session.get(topic);
    const formattedChain = prefixChainWithNamespace(chainId);
    const formattedAccounts = formatAccounts(accounts, chainId);
    const namespaces = session.namespaces[EVM_IDENTIFIER];
    if (!chainAlreadyInSession(session, chainId)) {
      namespaces?.chains?.push(formattedChain);
    }

    if (!accountsAlreadyInSession(session, formattedAccounts)) {
      namespaces.accounts = namespaces.accounts.concat(formattedAccounts);
    }

    const { acknowledged } = await this.signClient.update({
      topic,
      namespaces: {
        [EVM_IDENTIFIER]: namespaces,
      },
    });
    await acknowledged();

    if (this.chainId !== chainId) {
      await this.signClient.emit({
        topic,
        event: {
          name: "chainChanged",
          data: chainId,
        },
        chainId: formattedChain,
      });
      this.chainId = chainId;
    }

    await this.signClient.emit({
      topic,
      event: {
        name: "accountsChanged",
        data: formattedAccounts,
      },
      chainId: formattedChain,
    });
  };

  public approveRequest: ISingleEthereumEngine["approveRequest"] = async (
    params
  ) => {
    const { topic, id, result } = params;

    const response = result.jsonrpc ? result : formatJsonRpcResult(id, result);
    return await this.signClient.respond({
      topic,
      response,
    });
  };

  public rejectRequest: ISingleEthereumEngine["rejectRequest"] = async (
    params
  ) => {
    const { topic, id, error } = params;
    return await this.signClient.respond({
      topic,
      response: formatJsonRpcError(id, error),
    });
  };

  public disconnectSession: ISingleEthereumEngine["disconnectSession"] = async (
    params
  ) => {
    await this.signClient.disconnect({
      topic: params.topic,
      reason: params.error,
    });
    await this.disconnectPairings();
  };

  public getActiveSessions: ISingleEthereumEngine["getActiveSessions"] = () =>
    parseSessions(this.signClient.session.getAll());

  public getPendingSessionProposals: ISingleEthereumEngine["getPendingSessionProposals"] =
    () => parseProposals(this.signClient.proposal.getAll());

  public getPendingSessionRequests: ISingleEthereumEngine["getPendingSessionRequests"] =
    () => this.signClient.getPendingSessionRequests();

  // ---------- Private ----------------------------------------------- //

  private onSessionRequest = (event: SingleEthereumTypes.SessionRequest) => {
    event.params.chainId = parseChain(event.params.chainId);
    this.client.events.emit("session_request", event);
  };

  private onSessionProposal = (event: SingleEthereumTypes.SessionProposal) => {
    const proposal = parseProposal(event.params);
    try {
      validateProposalNamespaces(proposal);
    } catch (e) {
      this.client.logger.error(e);
      return this.rejectSession({
        id: event.id,
        error: getSdkError("UNSUPPORTED_NAMESPACE_KEY"),
      });
    }

    try {
      validateProposalChains(proposal);
    } catch (e) {
      this.client.logger.error(e);
      return this.rejectSession({
        id: event.id,
        error: getSdkError("UNSUPPORTED_CHAINS"),
      });
    }

    return this.client.events.emit("session_proposal", {
      id: event.id,
      params: proposal,
    });
  };

  private onSessionDelete = async (
    event: SingleEthereumTypes.SessionDelete
  ) => {
    this.client.events.emit("session_delete", event);
    await this.disconnectPairings();
  };

  private initializeEventListeners = () => {
    this.signClient.events.on("session_proposal", this.onSessionProposal);
    this.signClient.events.on("session_request", this.onSessionRequest);
    this.signClient.events.on("session_delete", this.onSessionDelete);
  };

  private disconnectPairings = async () => {
    const pairings = this.signClient.core.pairing.getPairings();
    if (pairings.length) {
      await Promise.all(
        pairings.map((pairing) =>
          this.signClient.core.pairing.disconnect({ topic: pairing.topic })
        )
      );
    }
  };
}
