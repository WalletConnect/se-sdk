import { Core } from "@walletconnect/core";
import { formatJsonRpcError } from "@walletconnect/jsonrpc-utils";
import { SignClient } from "@walletconnect/sign-client";
import { ICore, ISignClient, SessionTypes } from "@walletconnect/types";
import { getSdkError } from "@walletconnect/utils";
import { Wallet as CryptoWallet } from "@ethersproject/wallet";
import { TransactionRequest } from "@ethersproject/abstract-provider";

import { expect, describe, it, beforeEach, beforeAll, afterAll } from "vitest";
import { SingleEthereum, ISingleEthereum, EVM_IDENTIFIER } from "../src";
import {
  disconnect,
  TEST_APPROVE_PARAMS,
  TEST_CORE_OPTIONS,
  TEST_ETHEREUM_ADDRESS,
  TEST_ETHEREUM_CHAIN,
  TEST_ETHEREUM_CHAIN_PARSED,
  TEST_GOERLI_CHAIN_PARSED,
  TEST_NAMESPACES,
  TEST_OPTIONAL_NAMESPACES,
  TEST_REQUIRED_NAMESPACES,
  TEST_REQUIRED_NAMESPACES_FAIL_CHAINS,
  TEST_REQUIRED_NAMESPACES_FAIL_NAMESPACES,
  TEST_UPDATED_NAMESPACES,
} from "./shared";
import { parseChain, prefixChainWithNamespace } from "../src/utils";

describe("Sign Integration", () => {
  let core: ICore;
  let wallet: ISingleEthereum;
  let dapp: ISignClient;
  let uriString: string;
  let sessionApproval: () => Promise<any>;
  let session: SessionTypes.Struct;
  let cryptoWallet: CryptoWallet;

  beforeAll(() => {
    cryptoWallet = CryptoWallet.createRandom();
  });

  afterAll(async () => {
    await disconnect(core);
  });

  beforeEach(async () => {
    core = new Core(TEST_CORE_OPTIONS);
    dapp = await SignClient.init({
      ...TEST_CORE_OPTIONS,
      name: "Dapp",
    });
    const { uri, approval } = await dapp.connect({
      requiredNamespaces: TEST_REQUIRED_NAMESPACES,
      optionalNamespaces: TEST_OPTIONAL_NAMESPACES,
    });
    uriString = uri || "";
    sessionApproval = approval;
    wallet = await SingleEthereum.init({
      core,
      name: "wallet",
      metadata: {} as any,
      chainId: 1,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(wallet).to.be.exist;
    expect(dapp).to.be.exist;
    expect(core).to.be.exist;
  });

  it("should approve session proposal", async () => {
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params, verifyContext } = sessionProposal;
          expect(verifyContext).to.be.exist;
          expect(verifyContext.verified.validation).to.eq("UNKNOWN");
          session = await wallet.approveSession({
            id,
            ...TEST_APPROVE_PARAMS,
          });
          resolve(session);
        });
      }),
      new Promise(async (resolve) => {
        resolve(await sessionApproval());
      }),
      wallet.pair({ uri: uriString }),
    ]);
  });
  it("should approve session proposal with a different chainId", async () => {
    const newChainId = 2;
    await Promise.all([
      new Promise((resolve) => {
        dapp.on("session_event", (sessionEvent) => {
          const { params } = sessionEvent;
          expect(params.chainId).to.eq(prefixChainWithNamespace(newChainId));
          expect(params.event.name).to.eq("chainChanged");
          resolve(true);
        });
      }),
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params, verifyContext } = sessionProposal;
          expect(verifyContext).to.be.exist;
          expect(verifyContext.verified.validation).to.eq("UNKNOWN");
          session = await wallet.approveSession({
            id,
            ...TEST_APPROVE_PARAMS,
            chainId: newChainId,
          });
          resolve(session);
        });
      }),
      new Promise(async (resolve) => {
        resolve(await sessionApproval());
      }),
      wallet.pair({ uri: uriString }),
    ]);
  });
  it("should approve session proposal with optional methods", async () => {
    const newChainId = 2;
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params, verifyContext } = sessionProposal;
          expect(verifyContext).to.be.exist;
          expect(verifyContext.verified.validation).to.eq("UNKNOWN");
          session = await wallet.approveSession({
            id,
            ...TEST_APPROVE_PARAMS,
            chainId: newChainId,
          });
          resolve(session);
        });
      }),
      new Promise(async (resolve) => {
        resolve(await sessionApproval());
      }),
      wallet.pair({ uri: uriString }),
    ]);
    expect(session.namespaces[EVM_IDENTIFIER].methods).to.deep.eq(
      TEST_REQUIRED_NAMESPACES.eip155.methods.concat(TEST_OPTIONAL_NAMESPACES.eip155.methods),
    );
  });
  it("should reject session proposal", async () => {
    const rejectionError = getSdkError("USER_REJECTED");
    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { params } = sessionProposal;
          await wallet.rejectSession({
            id: params.id,
            error: rejectionError,
          });
          resolve();
        });
      }),
      new Promise<void>(async (resolve) => {
        // catch the rejection and compare
        try {
          await sessionApproval();
        } catch (err) {
          expect(err).to.toMatchObject(rejectionError);
        }
        resolve();
      }),
      wallet.pair({ uri: uriString }),
    ]);
  });
  it("should update session", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            ...TEST_APPROVE_PARAMS,
          });
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    expect(TEST_NAMESPACES).not.toMatchObject(TEST_UPDATED_NAMESPACES);
    // update the session
    await Promise.all([
      new Promise((resolve) => {
        dapp.events.on("session_update", (session) => {
          const { params } = session;
          expect(params.namespaces.eip155.accounts).to.toMatchObject(
            TEST_UPDATED_NAMESPACES.eip155.accounts,
          );
          expect(params.namespaces.eip155.methods).to.toMatchObject(
            TEST_UPDATED_NAMESPACES.eip155.methods,
          );
          expect(params.namespaces.eip155.events).to.toMatchObject(
            TEST_UPDATED_NAMESPACES.eip155.events,
          );
          resolve(session);
        });
      }),
      wallet.updateSession({
        topic: session.topic,
        chainId: TEST_GOERLI_CHAIN_PARSED,
        accounts: [TEST_ETHEREUM_ADDRESS],
      }),
    ]);
  });

  it("should respond to session request", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            chainId: TEST_ETHEREUM_CHAIN_PARSED,
            accounts: [cryptoWallet.address],
          });
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_request", async (sessionRequest) => {
          const { id, params, verifyContext } = sessionRequest;
          expect(verifyContext).to.be.exist;
          expect(verifyContext.verified.validation).to.eq("UNKNOWN");
          const requestParams = params.request.params as TransactionRequest[];
          const signTransaction = requestParams[0];
          const signature = await cryptoWallet.signTransaction(signTransaction);
          const response = await wallet.approveRequest({
            id,
            topic: session.topic,
            result: signature,
          });
          resolve(response);
        });
      }),
      new Promise<void>(async (resolve) => {
        const result = await dapp.request({
          topic: session.topic,
          request: {
            method: "eth_signTransaction",
            params: [
              {
                from: cryptoWallet.address,
                to: cryptoWallet.address,
                data: "0x",
                nonce: "0x01",
                gasPrice: "0x020a7ac094",
                gasLimit: "0x5208",
                value: "0x00",
              },
            ],
          },
          chainId: TEST_ETHEREUM_CHAIN,
        });
        expect(result).to.be.exist;
        expect(result).to.be.a("string");
        resolve();
      }),
    ]);
  });

  it.skip("should replace approved chainId on update", async () => {
    dapp = await SignClient.init({
      ...TEST_CORE_OPTIONS,
      name: "Dapp",
    });
    const { uri, approval } = await dapp.connect({
      optionalNamespaces: TEST_OPTIONAL_NAMESPACES,
    });
    sessionApproval = approval;
    uriString = uri || "";
    let session;
    wallet = await SingleEthereum.init({
      core,
      name: "wallet",
      metadata: {} as any,
      chainId: 1,
    });

    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            chainId: TEST_ETHEREUM_CHAIN_PARSED,
            accounts: [cryptoWallet.address],
          });
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);
    await Promise.all([
      new Promise((resolve) => {
        dapp.events.once("session_update", (session) => {
          const { params } = session;
          expect(params.namespaces.eip155.chains).to.toMatchObject([
            `${EVM_IDENTIFIER}:${TEST_GOERLI_CHAIN_PARSED}`,
          ]);
          resolve(session);
        });
      }),
      wallet.updateSession({
        topic: session.topic,
        chainId: TEST_GOERLI_CHAIN_PARSED,
        accounts: [TEST_ETHEREUM_ADDRESS],
      }),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await Promise.all([
      new Promise((resolve) => {
        dapp.events.once("session_update", (session) => {
          const { params } = session;
          expect(params.namespaces.eip155.chains).to.toMatchObject([
            `${EVM_IDENTIFIER}:${TEST_ETHEREUM_CHAIN_PARSED}`,
          ]);
          resolve(session);
        });
      }),
      wallet.updateSession({
        topic: session.topic,
        chainId: TEST_ETHEREUM_CHAIN_PARSED,
        accounts: [TEST_ETHEREUM_ADDRESS],
      }),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it("should request wallet_switchEthereumChain to session request in different chain", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            chainId: TEST_ETHEREUM_CHAIN_PARSED,
            accounts: [cryptoWallet.address],
          });
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);
    const originalChainId = wallet.engine.chainId;
    const expectedChainId = 5;

    expect(originalChainId).to.not.eq(expectedChainId);

    // change chainId
    wallet.engine.chainId = expectedChainId;

    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.on("session_request", async (sessionRequest) => {
          const { id, params, topic, verifyContext } = sessionRequest;
          if (params.request.method === "wallet_switchEthereumChain") {
            expect(wallet.engine.chainId).to.eq(expectedChainId);
            await wallet.approveRequest({
              id,
              topic: session.topic,
              result: null,
            });
            resolve();
          }
        });
        wallet.on("session_request", async (sessionRequest) => {
          const { id, params, verifyContext } = sessionRequest;
          if (params.request.method === "wallet_switchEthereumChain") return;
          expect(verifyContext).to.be.exist;
          expect(verifyContext.verified.validation).to.eq("UNKNOWN");
          const requestParams = params.request.params as TransactionRequest[];
          const signTransaction = requestParams[0];
          const signature = await cryptoWallet.signTransaction(signTransaction);
          const response = await wallet.approveRequest({
            id,
            topic: session.topic,
            result: signature,
          });
          resolve(response);
        });
      }),
      new Promise<void>(async (resolve) => {
        const result = await dapp.request({
          topic: session.topic,
          request: {
            method: "eth_signTransaction",
            params: [
              {
                from: cryptoWallet.address,
                to: cryptoWallet.address,
                data: "0x",
                nonce: "0x01",
                gasPrice: "0x020a7ac094",
                gasLimit: "0x5208",
                value: "0x00",
              },
            ],
          },
          chainId: TEST_ETHEREUM_CHAIN,
        });
        expect(result).to.be.exist;
        expect(result).to.be.a("string");
        resolve();
      }),
    ]);
    expect(wallet.engine.chainId).to.eq(originalChainId);
  });

  it("should handle reject to session request in different chain", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            chainId: TEST_ETHEREUM_CHAIN_PARSED,
            accounts: [cryptoWallet.address],
          });
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);
    const originalChainId = wallet.engine.chainId;
    const expectedChainId = 5;

    expect(originalChainId).to.not.eq(expectedChainId);

    // change chainId
    wallet.engine.chainId = expectedChainId;

    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.on("session_request", async (sessionRequest) => {
          const { id, params } = sessionRequest;
          if (params.request.method === "wallet_switchEthereumChain") {
            expect(wallet.engine.chainId).to.eq(expectedChainId);
            await wallet.rejectRequest({
              id,
              topic: session.topic,
              error: {
                message: "User rejected to switch chain",
                code: 500,
              },
            });
            resolve();
          }
        });
      }),
      new Promise<void>(async (resolve) => {
        try {
          await dapp.request({
            topic: session.topic,
            request: {
              method: "eth_signTransaction",
              params: [
                {
                  from: cryptoWallet.address,
                  to: cryptoWallet.address,
                  data: "0x",
                  nonce: "0x01",
                  gasPrice: "0x020a7ac094",
                  gasLimit: "0x5208",
                  value: "0x00",
                },
              ],
            },
            chainId: TEST_ETHEREUM_CHAIN,
          });
        } catch (e) {
          expect(e).to.be.exist;
          expect(e).to.toMatchObject(getSdkError("USER_REJECTED"));
          resolve();
        }
      }),
    ]);
    // chain was not updated so should stay the same
    expect(wallet.engine.chainId).to.eq(expectedChainId);
  });

  it("should disconnect from session", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            ...TEST_APPROVE_PARAMS,
          });
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    const reason = getSdkError("USER_DISCONNECTED");
    await Promise.all([
      new Promise<void>((resolve) => {
        dapp.events.on("session_delete", (sessionDelete) => {
          const { topic } = sessionDelete;
          expect(topic).to.be.eq(session.topic);
          resolve();
        });
      }),
      wallet.disconnectSession({ topic: session.topic, error: reason }),
    ]);
  });

  it("should receive session_disconnect", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            ...TEST_APPROVE_PARAMS,
          });
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    const reason = getSdkError("USER_DISCONNECTED");
    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.on("session_delete", (sessionDelete) => {
          const { topic } = sessionDelete;
          expect(topic).to.be.eq(session.topic);
          resolve();
        });
      }),
      dapp.disconnect({ topic: session.topic, reason }),
    ]);
  });

  it("should get active sessions", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            ...TEST_APPROVE_PARAMS,
          });
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    const sessions = wallet.getActiveSessions();
    expect(sessions).to.be.exist;
    expect(Object.values(sessions!).length).to.be.eq(1);
    expect(Object.keys(sessions!)[0]).to.be.eq(session.topic);
  });

  it("should get pending session proposals", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.on("session_proposal", () => {
          const proposals = wallet.getPendingSessionProposals();
          expect(proposals).to.be.exist;
          expect(Object.values(proposals!).length).to.be.eq(1);
          resolve();
        });
      }),
      wallet.pair({ uri: uriString }),
    ]);
  });

  it("should get pending session requests", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            ...TEST_APPROVE_PARAMS,
          });
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    const requestParams = {
      method: "eth_signTransaction",
      params: [
        {
          from: cryptoWallet.address,
          to: cryptoWallet.address,
          data: "0x",
          nonce: "0x01",
          gasPrice: "0x020a7ac094",
          gasLimit: "0x5208",
          value: "0x00",
        },
      ],
    };
    let expectedError;
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_request", async () => {
          const pendingRequests = wallet.getPendingSessionRequests();
          const request = pendingRequests![0];
          const signTransaction = request.params.request.params[0];
          const signature = await cryptoWallet.signTransaction(signTransaction);
          expectedError = formatJsonRpcError(request.id, signature);
          const response = await wallet.rejectRequest({
            topic: session.topic,
            ...expectedError,
          });
          resolve(response);
          resolve(pendingRequests);
        });
      }),
      new Promise<void>(async (resolve) => {
        try {
          await dapp.request({
            topic: session.topic,
            request: requestParams,
            chainId: TEST_ETHEREUM_CHAIN,
          });
        } catch (e) {
          expect(e).to.be.exist;
          expect(e).to.toMatchObject(expectedError.error);
        }
        resolve();
      }),
    ]);
  });
  it("should emit session_proposal_error with failed chains validation", async () => {
    const core = new Core(TEST_CORE_OPTIONS);
    const dapp = await SignClient.init({
      ...TEST_CORE_OPTIONS,
      name: "Dapp",
    });
    const { uri, approval } = await dapp.connect({
      requiredNamespaces: TEST_REQUIRED_NAMESPACES_FAIL_CHAINS,
    });
    const uriString = uri || "";
    const wallet = await SingleEthereum.init({
      core,
      name: "wallet",
      metadata: {} as any,
      chainId: 1,
    });
    const expectedError = getSdkError("UNSUPPORTED_CHAINS");
    await Promise.all([
      new Promise<void>(async (resolve) => {
        wallet.on("session_proposal_error", (sessionProposalError) => {
          expect(sessionProposalError).to.be.exist;
          expect(sessionProposalError).to.toMatchObject(expectedError);
          resolve();
        });
      }),
      new Promise<void>(async (resolve) => {
        await approval().catch((error) => {
          expect(error).to.be.exist;
          expect(error).to.toMatchObject(expectedError);
          resolve();
        });
      }),
      wallet.pair({ uri: uriString }),
    ]);
    [dapp, wallet].forEach(async (client) => {
      await disconnect(client.core);
    });
  });
  it("should emit session_proposal_error with failed namespaces validation", async () => {
    const core = new Core(TEST_CORE_OPTIONS);
    const dapp = await SignClient.init({
      ...TEST_CORE_OPTIONS,
      name: "Dapp",
    });
    const { uri, approval } = await dapp.connect({
      requiredNamespaces: TEST_REQUIRED_NAMESPACES_FAIL_NAMESPACES,
    });
    const uriString = uri || "";
    const wallet = await SingleEthereum.init({
      core,
      name: "wallet",
      metadata: {} as any,
      chainId: 1,
    });
    const expectedError = getSdkError("UNSUPPORTED_NAMESPACE_KEY");
    await Promise.all([
      new Promise<void>(async (resolve) => {
        wallet.on("session_proposal_error", (sessionProposalError) => {
          expect(sessionProposalError).to.be.exist;
          expect(sessionProposalError).to.toMatchObject(expectedError);
          resolve();
        });
      }),
      new Promise<void>(async (resolve) => {
        await approval().catch((error) => {
          expect(error).to.be.exist;
          expect(error).to.toMatchObject(expectedError);
          resolve();
        });
      }),
      wallet.pair({ uri: uriString }),
    ]);
    [dapp, wallet].forEach(async (client) => {
      await disconnect(client.core);
    });
  });
  it("should approve proposal with only optional EIP155 chain", async () => {
    const core = new Core(TEST_CORE_OPTIONS);
    const dapp = await SignClient.init({
      ...TEST_CORE_OPTIONS,
      name: "Dapp",
    });
    const { uri, approval } = await dapp.connect({
      optionalNamespaces: TEST_OPTIONAL_NAMESPACES,
    });
    const uriString = uri || "";
    const wallet = await SingleEthereum.init({
      core,
      name: "wallet",
      metadata: {} as any,
      chainId: 1,
    });
    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.on("session_proposal", async (proposal) => {
          expect(proposal).to.be.exist;
          expect(proposal.params.optionalNamespaces).to.be.exist;
          expect(proposal.params.optionalNamespaces.eip155).to.be.exist;
          expect(proposal.params.optionalNamespaces.eip155.chains).to.eql([
            parseChain(TEST_OPTIONAL_NAMESPACES.eip155.chains[0]),
          ]);
          await wallet.approveSession({
            id: proposal.id,
            ...TEST_APPROVE_PARAMS,
          });
          resolve();
        });
      }),
      approval(),
      wallet.pair({ uri: uriString }),
    ]);
    [dapp, wallet].forEach(async (client) => {
      await disconnect(client.core);
    });
  });
});
