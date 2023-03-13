import { formatJsonRpcError, formatJsonRpcResult } from "@walletconnect/jsonrpc-utils";
import { getSdkError } from "@walletconnect/utils";
import { Web3Wallet, IWeb3Wallet } from "@walletconnect/web3wallet";
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
  formatAuthAddress,
} from "../utils";

export class Engine extends ISingleEthereumEngine {
  public web3wallet: IWeb3Wallet;
  public chainId?: number;

  constructor(client: ISingleEthereumEngine["client"]) {
    super(client);
    // initialized in init()
    this.web3wallet = {} as IWeb3Wallet;
  }

  public init = async () => {
    this.web3wallet = await Web3Wallet.init({
      core: this.client.core,
      metadata: this.client.metadata,
    });
    this.initializeEventListeners();
  };

  public pair: ISingleEthereumEngine["pair"] = async (params) => {
    await this.client.core.pairing.pair(params);
  };

  public approveSession: ISingleEthereumEngine["approveSession"] = async (params) => {
    const { id, chainId, accounts } = params;
    const proposal = this.web3wallet.engine.signClient.proposal.get(id);
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

    const session = await this.web3wallet.approveSession(approveParams);
    this.chainId = chainId;
    return session;
  };

  public rejectSession: ISingleEthereumEngine["rejectSession"] = async (params) => {
    return await this.web3wallet.rejectSession({
      id: params.id,
      reason: params.error,
    });
  };

  public updateSession: ISingleEthereumEngine["updateSession"] = async (params) => {
    const { topic, chainId, accounts } = params;
    const session = this.web3wallet.engine.signClient.session.get(topic);
    const formattedChain = prefixChainWithNamespace(chainId);
    const formattedAccounts = formatAccounts(accounts, chainId);
    const namespaces = session.namespaces[EVM_IDENTIFIER];
    if (!chainAlreadyInSession(session, chainId)) {
      namespaces?.chains?.push(formattedChain);
    }

    if (!accountsAlreadyInSession(session, formattedAccounts)) {
      namespaces.accounts = namespaces.accounts.concat(formattedAccounts);
    }

    await this.web3wallet.updateSession({
      topic,
      namespaces: {
        [EVM_IDENTIFIER]: namespaces,
      },
    });

    if (this.chainId !== chainId) {
      await this.web3wallet.emitSessionEvent({
        topic,
        event: {
          name: "chainChanged",
          data: chainId,
        },
        chainId: formattedChain,
      });
      this.chainId = chainId;
    }

    await this.web3wallet.emitSessionEvent({
      topic,
      event: {
        name: "accountsChanged",
        data: formattedAccounts,
      },
      chainId: formattedChain,
    });
  };

  public approveRequest: ISingleEthereumEngine["approveRequest"] = async (params) => {
    const { topic, id, result } = params;

    const response = result.jsonrpc ? result : formatJsonRpcResult(id, result);
    return await this.web3wallet.respondSessionRequest({
      topic,
      response,
    });
  };

  public rejectRequest: ISingleEthereumEngine["rejectRequest"] = async (params) => {
    const { topic, id, error } = params;
    return await this.web3wallet.respondSessionRequest({
      topic,
      response: formatJsonRpcError(id, error),
    });
  };

  public disconnectSession: ISingleEthereumEngine["disconnectSession"] = async (params) => {
    await this.web3wallet.disconnectSession({
      topic: params.topic,
      reason: params.error,
    });
    await this.disconnectPairings();
  };

  public getActiveSessions: ISingleEthereumEngine["getActiveSessions"] = () => {
    const sessions = this.web3wallet.getActiveSessions();
    if (!sessions) return undefined;
    return parseSessions(Object.values(sessions));
  };

  public getPendingSessionProposals: ISingleEthereumEngine["getPendingSessionProposals"] = () => {
    const proposals = this.web3wallet.getPendingSessionProposals();
    if (!proposals) return undefined;
    return parseProposals(Object.values(proposals));
  };

  public getPendingSessionRequests: ISingleEthereumEngine["getPendingSessionRequests"] = () => {
    const requests = this.web3wallet.getPendingSessionRequests();
    if (!requests) return undefined;
    return requests;
  };

  // ---------- Auth ----------------------------------------------- //

  public approveAuthRequest: ISingleEthereumEngine["approveAuthRequest"] = async (params) => {
    const { id, signature, address } = params;
    return await this.web3wallet.respondAuthRequest(
      {
        id,
        signature: {
          s: signature,
          t: "eip191",
        },
      },
      formatAuthAddress(address),
    );
  };

  public rejectAuthRequest: ISingleEthereumEngine["rejectAuthRequest"] = async (params) => {
    const { id, error } = params;
    return await this.web3wallet.respondAuthRequest(
      {
        id,
        error,
      },
      "",
    );
  };

  public getPendingAuthRequests: ISingleEthereumEngine["getPendingAuthRequests"] = () => {
    return [];
  };

  public formatAuthMessage: ISingleEthereumEngine["formatAuthMessage"] = (payload, address) => {
    return this.web3wallet.formatMessage(payload, formatAuthAddress(address));
  };

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

  private onSessionDelete = async (event: SingleEthereumTypes.SessionDelete) => {
    this.client.events.emit("session_delete", event);
    await this.disconnectPairings();
  };

  private onAuthRequest = (event: SingleEthereumTypes.AuthRequest) => {
    this.client.events.emit("auth_request", event);
  };

  private initializeEventListeners = () => {
    this.web3wallet.on("session_proposal", this.onSessionProposal);
    this.web3wallet.on("session_request", this.onSessionRequest);
    this.web3wallet.on("session_delete", this.onSessionDelete);
    this.web3wallet.on("auth_request", this.onAuthRequest);
  };

  private disconnectPairings = async () => {
    const pairings = this.web3wallet.core.pairing.getPairings();
    if (pairings.length) {
      await Promise.all(
        pairings.map((pairing) =>
          this.web3wallet.core.pairing.disconnect({ topic: pairing.topic }),
        ),
      );
    }
  };
}
