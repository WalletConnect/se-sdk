/* eslint-disable no-console */
import ProjectInfoCard from "@/components/ProjectInfoCard";
import ProposalSelectSection from "@/components/ProposalSelectSection";
import RequestModalContainer from "@/components/RequestModalContainer";
import SessionProposalChainCard from "@/components/SessionProposalChainCard";
import ModalStore from "@/store/ModalStore";
import { eip155Addresses } from "@/utils/EIP155WalletUtil";
import { isEIP155Chain } from "@/utils/HelperUtil";
import { web3wallet } from "@/utils/WalletConnectUtil";
import { Button, Divider, Modal, Text } from "@nextui-org/react";
import { SessionTypes } from "@walletconnect/types";
import { getSdkError } from "@walletconnect/utils";
import { Fragment, useEffect, useState } from "react";
import SettingsStore from "@/store/SettingsStore";
import { useSnapshot } from "valtio";

export default function SessionProposalModal() {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const { activeChainId } = useSnapshot(SettingsStore.state);
  const hasSelected = Object.keys(selectedAccounts).length;

  // Get proposal data and wallet address from store
  const proposal = ModalStore.state.data?.proposal;

  console.log("proposal", proposal);
  // Ensure proposal is defined
  if (!proposal) {
    return <Text>Missing proposal data</Text>;
  }

  // Get required proposal data
  const { id, params } = proposal;

  const { proposer, requiredNamespaces, optionalNamespaces, sessionProperties, relays } = params;
  const requiredNamespaceKeys = requiredNamespaces ? Object.keys(requiredNamespaces) : [];
  const optionalNamespaceKeys = optionalNamespaces ? Object.keys(optionalNamespaces) : [];

  const pendingProposals = web3wallet.getPendingSessionProposals();
  console.log("pendingProposals", pendingProposals);
  // Add / remove address from EIP155 selection
  function onSelectAccount(chain: string, account: string) {
    if (selectedAccounts?.includes(account)) {
      const newSelectedAccounts = selectedAccounts?.filter((a) => a !== account);
      setSelectedAccounts(newSelectedAccounts);
    } else {
      setSelectedAccounts([...selectedAccounts, account]);
    }
  }

  // Hanlde approve action, construct session namespace
  async function onApprove() {
    if (proposal) {
      const accounts: string[] = [];
      console.log("selectedAccounts", selectedAccounts, activeChainId);
      const session = await web3wallet.approveSession({
        id,
        chainId: activeChainId,
        accounts: selectedAccounts,
      });

      SettingsStore.setActiveSession(session.topic);
    }
    ModalStore.close();
  }

  // Hanlde reject action
  async function onReject() {
    if (proposal) {
      await web3wallet.rejectSession({
        id,
        error: getSdkError("USER_REJECTED_METHODS"),
      });
    }
    ModalStore.close();
  }

  // Render account selection checkboxes based on chain
  function renderAccountSelection(chain: string) {
    if (isEIP155Chain(chain)) {
      return (
        <ProposalSelectSection
          addresses={eip155Addresses}
          selectedAddresses={selectedAccounts}
          onSelect={onSelectAccount}
          chain={chain}
        />
      );
    }
  }

  return (
    <Fragment>
      <RequestModalContainer title="Session Proposal">
        <ProjectInfoCard metadata={proposer.metadata} />
        <Divider y={2} />
        {requiredNamespaceKeys.length ? <Text h4>Required Namespaces</Text> : null}
        {requiredNamespaceKeys.map((chain) => {
          return (
            <Fragment key={chain}>
              <Text css={{ marginBottom: "$5" }}>{`Review ${chain} permissions`}</Text>
              <SessionProposalChainCard requiredNamespace={requiredNamespaces[chain]} />
              <Divider y={2} />
            </Fragment>
          );
        })}
        {optionalNamespaceKeys.length ? <Text h4>Optional Namespaces</Text> : null}
        {optionalNamespaceKeys.map((chain) => {
          return (
            <Fragment key={chain}>
              <Text css={{ marginBottom: "$5" }}>{`Review ${chain} permissions`}</Text>
              <SessionProposalChainCard requiredNamespace={optionalNamespaces[chain]} />

              <Divider y={2} />
            </Fragment>
          );
        })}
        <Fragment>{renderAccountSelection(`eip155`)}</Fragment>
      </RequestModalContainer>

      <Modal.Footer>
        <Button auto flat color="error" onPress={onReject}>
          Reject
        </Button>

        <Button
          auto
          flat
          color="success"
          onPress={onApprove}
          disabled={!hasSelected}
          css={{ opacity: hasSelected ? 1 : 0.4 }}
        >
          Approve
        </Button>
      </Modal.Footer>
    </Fragment>
  );
}
