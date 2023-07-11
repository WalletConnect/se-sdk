/* eslint-disable no-console */
import { EIP155_SIGNING_METHODS } from "@/data/EIP155Data";
import ModalStore from "@/store/ModalStore";
import SettingsStore from "@/store/SettingsStore";
import { web3wallet } from "@/utils/WalletConnectUtil";
import { SingleEthereumTypes } from "@walletconnect/se-sdk";
import { SignClientTypes } from "@walletconnect/types";
import { useCallback, useEffect } from "react";
import { useSnapshot } from "valtio";

export default function useWalletConnectEventsManager() {
  const { web3WalletReady } = useSnapshot(SettingsStore.state);

  /******************************************************************************
   * 1. Open session proposal modal for confirmation / rejection
   *****************************************************************************/
  const onSessionProposal = useCallback(
    (proposal: SingleEthereumTypes.EventArguments["session_proposal"]) => {
      ModalStore.open("SessionProposalModal", { proposal });
    },
    [],
  );

  /******************************************************************************
   * 3. Open request handling modal based on method that was used
   *****************************************************************************/
  const onSessionRequest = useCallback(
    async (requestEvent: SingleEthereumTypes.EventArguments["session_request"]) => {
      console.log("session_request", requestEvent);
      const { topic, params } = requestEvent;
      const { request } = params;
      const requestSession = web3wallet.getActiveSessions()?.[topic];
      const pendingRequests = web3wallet.getPendingSessionRequests();
      console.log("pendingRequests", pendingRequests);

      switch (request.method) {
        case EIP155_SIGNING_METHODS.ETH_SIGN:
        case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
          return ModalStore.open("SessionSignModal", {
            requestEvent,
            requestSession,
          });

        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
          return ModalStore.open("SessionSignTypedDataModal", {
            requestEvent,
            requestSession,
          });

        case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
          return ModalStore.open("SessionSendTransactionModal", {
            requestEvent,
            requestSession,
          });
        case EIP155_SIGNING_METHODS.WALLET_SWITCH_ETHEREUM_CHAIN:
          return ModalStore.open("SwitchChainModal", {
            requestEvent,
            requestSession,
          });
        default:
          return ModalStore.open("SessionUnsuportedMethodModal", {
            requestEvent,
            requestSession,
          });
      }
    },
    [],
  );

  const onAuthRequest = useCallback(
    (request: SingleEthereumTypes.EventArguments["auth_request"]) => {
      ModalStore.open("AuthRequestModal", { authRequest: request });
    },
    [],
  );

  /******************************************************************************
   * Set up WalletConnect event listeners
   *****************************************************************************/
  useEffect(() => {
    if (web3WalletReady) {
      web3wallet.on("session_proposal", onSessionProposal);
      web3wallet.on("session_request", onSessionRequest);
      web3wallet.on("session_delete", (data: any) => {
        console.log("delete", data);
      });
      web3wallet.on("auth_request", onAuthRequest);
    }

    return () => {
      if (web3WalletReady) {
        web3wallet.off("session_proposal", onSessionProposal);
        web3wallet.off("session_request", onSessionRequest);
        web3wallet.off("session_delete", (data: any) => {
          console.log("delete", data);
        });
        web3wallet.off("auth_request", onAuthRequest);
      }
    };
  }, [web3WalletReady, onSessionProposal, onSessionRequest]);
}
