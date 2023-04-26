import SettingsStore from "@/store/SettingsStore";
import { Core } from "@walletconnect/core";
import { SingleEthereum, ISingleEthereum } from "@walletconnect/se-sdk";
import { EIP155_MAINNET_CHAINS } from "@/data/EIP155Data";
import { ICore } from "@walletconnect/types";

export let web3wallet: ISingleEthereum;
export let core: ICore;

export async function createWeb3Wallet() {
  if (!SettingsStore.state.web3WalletReady && typeof window !== "undefined") {
    core = new Core({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
      logger: "debug",
      relayUrl: process.env.NEXT_PUBLIC_RELAY_URL,
    });

    web3wallet = await SingleEthereum.init({
      core,
      metadata: {
        name: "React Wallet",
        description: "React Wallet for WalletConnect",
        url: "https://walletconnect.com/",
        icons: ["https://avatars.githubusercontent.com/u/37784886"],
      },
    });

    SettingsStore.setWeb3WalletReady(true);
    SettingsStore.setActiveChainId(EIP155_MAINNET_CHAINS["eip155:1"].chainId);
  }
  updateActiveSessions();
}

export function updateActiveSessions() {
  if (!web3wallet) return; // wallet not initialized yet
  const sessions = web3wallet.getActiveSessions();
  if (sessions) {
    SettingsStore.setActiveSession(Object.keys(sessions)[0]);
  } else {
    SettingsStore.setActiveSession("");
  }
}
