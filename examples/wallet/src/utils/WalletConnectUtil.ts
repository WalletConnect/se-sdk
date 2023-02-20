import SettingsStore from "@/store/SettingsStore";
import { Core } from "@walletconnect/core";
import { Web3Wallet } from "@walletconnect/web3wallet";
import { SingleEthereum } from "@walletconnect/se-sdk";

export let web3wallet: InstanceType<typeof SingleEthereum>;
export let core: InstanceType<typeof Core>;

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

    console.log("web3wallet", web3wallet);
    window.web3wallet = web3wallet;
    SettingsStore.setWeb3WalletReady(true);
  }
}
