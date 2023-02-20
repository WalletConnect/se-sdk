import { ProposalTypes, SessionTypes } from "@walletconnect/types";
import { EVM_IDENTIFIER } from "../constants";
import { formatChain } from "./transform";

export const validateProposalNamespaces = (proposal: ProposalTypes.Struct) => {
  if (
    // if the proposal contains non EVM namespaces
    Object.keys(proposal.requiredNamespaces).filter(
      (key) => key !== EVM_IDENTIFIER
    ).length > 0
  ) {
    throw new Error(
      "Invalid Session Proposal. Proposal contains non-EVM (`eip155`) namespaces."
    );
  }
};

export const validateProposalChains = (proposal: ProposalTypes.Struct) => {
  const eip155 = proposal.requiredNamespaces[EVM_IDENTIFIER];
  const eip155Chains = eip155 && eip155.chains;

  if (
    // if the proposal contains more than one EVM chain
    !eip155 ||
    !eip155Chains ||
    eip155Chains.length > 1
  ) {
    throw new Error(
      "Invalid Session Chains. Proposed either no `eip155` chains or more than one."
    );
  }
};

export const chainAlreadyInSession = (
  session: SessionTypes.Struct,
  chainId: number
) => {
  return session.namespaces?.[EVM_IDENTIFIER]?.chains?.includes(
    formatChain(chainId)
  );
};
