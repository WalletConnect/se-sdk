import ProjectInfoCard from "@/components/ProjectInfoCard";
import RequesDetailsCard from "@/components/RequestDetalilsCard";
import RequestMethodCard from "@/components/RequestMethodCard";
import RequestModalContainer from "@/components/RequestModalContainer";
import ModalStore from "@/store/ModalStore";
import SettingsStore from "@/store/SettingsStore";
import { web3wallet } from "@/utils/WalletConnectUtil";
import { eip155Addresses } from "@/utils/EIP155WalletUtil";
import { Button, Divider, Modal, Text } from "@nextui-org/react";
import { Fragment } from "react";
import { useSnapshot } from "valtio";

export default function SwitchChainModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent;
  const requestSession = ModalStore.state.data?.requestSession;
  const { account, activeChainId } = useSnapshot(SettingsStore.state);
  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>;
  }

  // Get required request data
  const { topic, params } = requestEvent;
  const { request } = params;
  const hexChain = (params.request.params as Array<{ chainId: string }>)[0].chainId;

  // Handle approve action (logic varies based on request method)
  async function onApprove() {
    if (requestEvent) {
      await web3wallet.approveRequest({
        topic,
        id: requestEvent.id,
        result: {},
      });
      SettingsStore.setActiveChainId(parseInt(hexChain));
      await web3wallet.updateSession({
        topic,
        chainId: parseInt(hexChain),
        accounts: [eip155Addresses[account]],
      });
      ModalStore.close();
    }
  }

  // Handle reject action
  async function onReject() {
    if (requestEvent) {
      await web3wallet.rejectRequest({
        topic,
        id: requestEvent.id,
        error: {
          code: 4001,
          message: "User rejected switch chain request",
        },
      });
      ModalStore.close();
    }
  }

  return (
    <Fragment>
      <RequestModalContainer title="Switch Chain Request">
        <ProjectInfoCard metadata={requestSession.peer.metadata} />

        <Divider y={2} />

        <RequesDetailsCard
          chains={[`eip155:${parseInt(hexChain)}`]}
          protocol={requestSession.relay.protocol}
        />

        <Divider y={2} />

        <RequestMethodCard methods={[request.method]} />
      </RequestModalContainer>

      <Modal.Footer>
        <Button auto flat color="error" onPress={onReject}>
          Reject
        </Button>
        <Button auto flat color="success" onPress={onApprove}>
          Approve
        </Button>
      </Modal.Footer>
    </Fragment>
  );
}
