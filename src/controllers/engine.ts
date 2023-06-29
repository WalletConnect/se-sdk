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
  private pendingInternalRequests: {
    id: number;
    resolve: <T>(value?: T | PromiseLike<T>) => void;
    reject: <T>(value?: T | PromiseLike<T>) => void;
  }[] = [];

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
    const requiredChain = proposal.requiredNamespaces[EVM_IDENTIFIER].chains?.[0];
    const requiredParsed = requiredChain ? parseInt(parseChain(requiredChain)) : chainId;
    const approvedChains = [requiredParsed];

    if (requiredParsed !== chainId) {
      approvedChains.push(chainId);
    }

    const approveParams = {
      id,
      namespaces: {
        [EVM_IDENTIFIER]: {
          ...proposal.requiredNamespaces[EVM_IDENTIFIER],
          accounts: approvedChains.map((chain) => formatAccounts(accounts, chain)).flat(),
          chains: approvedChains.map((chain) => prefixChainWithNamespace(chain)),
        },
      },
    };

    const optionalMethods = proposal.optionalNamespaces?.[EVM_IDENTIFIER]?.methods;
    if (optionalMethods) {
      approveParams.namespaces[EVM_IDENTIFIER].methods = approveParams.namespaces[
        EVM_IDENTIFIER
      ].methods
        .concat(optionalMethods)
        .flat();
    }

    const session = await this.web3wallet.approveSession(approveParams);
    this.chainId = chainId;
    // emit chainChanged if a different chain is approved other than the required
    if (approvedChains.length > 1) {
      setTimeout(() => this.changeChain(session.topic, chainId), 2_000);
    }

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
      await this.changeChain(topic, chainId);
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
    if (this.shouldHandleInternalRequest(id, true)) return;
    const response = result.jsonrpc ? result : formatJsonRpcResult(id, result);
    return await this.web3wallet.respondSessionRequest({
      topic,
      response,
    });
  };

  public rejectRequest: ISingleEthereumEngine["rejectRequest"] = async (params) => {
    const { topic, id, error } = params;
    if (this.shouldHandleInternalRequest(id, false)) return;
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
    return this.web3wallet.getPendingAuthRequests();
  };

  public formatAuthMessage: ISingleEthereumEngine["formatAuthMessage"] = (payload, address) => {
    return this.web3wallet.formatMessage(payload, formatAuthAddress(address));
  };

  // ---------- Private ----------------------------------------------- //

  private onSessionRequest = async (event: SingleEthereumTypes.SessionRequest) => {
    event.params.chainId = parseChain(event.params.chainId);

    if (parseInt(event.params.chainId) !== this.chainId) {
      this.client.logger.info(
        `Session request chainId ${event.params.chainId} does not match current chainId ${this.chainId}. Attempting to switch`,
      );
      await this.switchEthereumChain(event).catch((e) => {
        this.client.logger.warn(e);
      });
    }

    this.client.events.emit("session_request", event);
  };

  private onSessionProposal = (event: SingleEthereumTypes.SessionProposal) => {
    const proposal = parseProposal(event.params);
    try {
      validateProposalNamespaces(proposal);
    } catch (e) {
      this.client.logger.error(e);
      const error = getSdkError("UNSUPPORTED_NAMESPACE_KEY");
      this.client.events.emit("session_proposal_error", error);
      return this.rejectSession({
        id: event.id,
        error,
      });
    }

    try {
      validateProposalChains(proposal);
    } catch (e) {
      this.client.logger.error(e);
      const error = getSdkError("UNSUPPORTED_CHAINS");
      this.client.events.emit("session_proposal_error", error);
      return this.rejectSession({
        id: event.id,
        error,
      });
    }
    return this.client.events.emit("session_proposal", {
      id: event.id,
      params: proposal,
      verifyContext: event.verifyContext,
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

  private changeChain = async (topic: string, chainId: number) => {
    await this.web3wallet.engine.signClient.ping({ topic });
    await this.web3wallet.emitSessionEvent({
      topic,
      event: {
        name: "chainChanged",
        data: chainId,
      },
      chainId: prefixChainWithNamespace(chainId),
    });
  };

  private switchEthereumChain = async (event: SingleEthereumTypes.SessionRequest) => {
    const { topic, params } = event;
    const chainId = parseInt(params.chainId);

    // return early if the request is to switch to the current chain
    if (["wallet_switchEthereumChain", "wallet_addEthereumChain"].includes(params.request.method))
      return;

    let requestResolve: <T>(value?: T | PromiseLike<T>) => void;
    let requestReject: <T>(value?: T | PromiseLike<T>) => void;
    await new Promise((resolve, reject) => {
      requestResolve = resolve;
      requestReject = reject;
      const reqId = this.pendingInternalRequests.length + 1;
      this.pendingInternalRequests.push({
        id: reqId,
        resolve: requestResolve,
        reject: requestReject,
      });
      this.client.events.emit("session_request", {
        id: reqId,
        topic,
        params: {
          request: {
            method: "wallet_switchEthereumChain",
            params: [
              {
                chainId,
              },
            ],
          },
          chainId,
        },
      });
    });
    this.chainId = chainId;
  };

  private shouldHandleInternalRequest = (id: number, isSuccess: boolean) => {
    const internalRequest = this.pendingInternalRequests.find((r) => r.id === id);
    if (internalRequest) {
      this.pendingInternalRequests = this.pendingInternalRequests.filter((r) => r.id !== id);
      isSuccess ? internalRequest.resolve() : internalRequest.reject();
    }
    return !!internalRequest;
  };
}
