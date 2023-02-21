import { proxy } from "valtio";

/**
 * Types
 */
interface State {
  testNets: boolean;
  account: number;
  eip155Address: string;
  web3WalletReady: boolean;
  activeChainId: number;
  activeSession: string;
}

/**
 * State
 */
const state = proxy<State>({
  testNets:
    typeof localStorage !== "undefined"
      ? Boolean(localStorage.getItem("TEST_NETS"))
      : true,
  account: 0,
  eip155Address: "",
  web3WalletReady: false,
  activeChainId: 1,
  activeSession: "",
});

/**
 * Store / Actions
 */
const SettingsStore = {
  state,

  setAccount(value: number) {
    state.account = value;
  },

  setEIP155Address(eip155Address: string) {
    state.eip155Address = eip155Address;
  },

  toggleTestNets() {
    state.testNets = !state.testNets;
    if (state.testNets) {
      localStorage.setItem("TEST_NETS", "YES");
    } else {
      localStorage.removeItem("TEST_NETS");
    }
  },

  setWeb3WalletReady(value: boolean) {
    state.web3WalletReady = value;
  },

  setActiveChainId(value: number) {
    state.activeChainId = value;
  },

  setActiveSession(value: string) {
    state.activeSession = value;
  },
};

export default SettingsStore;
