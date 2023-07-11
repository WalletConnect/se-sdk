import { SessionTypes, SignClientTypes } from "@walletconnect/types";
import { SingleEthereumTypes } from "@walletconnect/se-sdk";
import { proxy } from "valtio";

/**
 * Types
 */
interface ModalData {
  proposal?: SingleEthereumTypes.EventArguments["session_proposal"];
  requestEvent?: SingleEthereumTypes.EventArguments["session_request"];
  requestSession?: SessionTypes.Struct;
  authRequest?: SingleEthereumTypes.AuthRequest;
}
interface State {
  open: boolean;
  view?:
    | "SessionProposalModal"
    | "SessionSignModal"
    | "SessionSignTypedDataModal"
    | "SessionSendTransactionModal"
    | "SessionUnsuportedMethodModal"
    | "AuthRequestModal"
    | "SwitchChainModal";
  data?: ModalData;
}

/**
 * State
 */
const state = proxy<State>({
  open: false,
});

/**
 * Store / Actions
 */
const ModalStore = {
  state,

  open(view: State["view"], data: State["data"]) {
    state.view = view;
    state.data = data;
    state.open = true;
  },

  close() {
    state.open = false;
  },
};

export default ModalStore;
