import { Core } from "@walletconnect/core";
import { formatJsonRpcError } from "@walletconnect/jsonrpc-utils";
import { SignClient } from "@walletconnect/sign-client";
import { ICore, ISignClient, SessionTypes } from "@walletconnect/types";
import { getSdkError } from "@walletconnect/utils";
import { Wallet as CryptoWallet } from "@ethersproject/wallet";

import { expect, describe, it, beforeEach, beforeAll, afterAll } from "vitest";
import { SingleEthereum, ISingleEthereum } from "../src";
import {
  disconnect,
  TEST_APPROVE_PARAMS,
  TEST_CORE_OPTIONS,
  TEST_ETHEREUM_ADDRESS,
  TEST_ETHEREUM_CHAIN,
  TEST_ETHEREUM_CHAIN_PARSED,
  TEST_GOERLI_CHAIN_PARSED,
  TEST_NAMESPACES,
  TEST_REQUIRED_NAMESPACES,
  TEST_UPDATED_NAMESPACES,
} from "./shared";

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
    });
    uriString = uri || "";
    sessionApproval = approval;
    wallet = await SingleEthereum.init({
      core,
      name: "wallet",
      metadata: {} as any,
    });
    expect(wallet).to.be.exist;
    expect(dapp).to.be.exist;
    expect(core).to.be.exist;
  });

  it("should approve session proposal", async () => {
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
      new Promise(async (resolve) => {
        resolve(await sessionApproval());
      }),
      wallet.pair({ uri: uriString }),
    ]);
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
          expect(params.namespaces).to.toMatchObject(TEST_UPDATED_NAMESPACES);
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
          const { id, params } = sessionRequest;
          const signTransaction = params.request.params[0];
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
    expect(Object.values(sessions).length).to.be.eq(1);
    expect(Object.keys(sessions)[0]).to.be.eq(session.topic);
  });

  it("should get pending session proposals", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.on("session_proposal", () => {
          const proposals = wallet.getPendingSessionProposals();
          expect(proposals).to.be.exist;
          expect(Object.values(proposals).length).to.be.eq(1);
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
          const request = pendingRequests[0];
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
});
