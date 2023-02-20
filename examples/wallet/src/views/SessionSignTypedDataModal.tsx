import ProjectInfoCard from "@/components/ProjectInfoCard";
import RequestDataCard from "@/components/RequestDataCard";
import RequesDetailsCard from "@/components/RequestDetalilsCard";
import RequestMethodCard from "@/components/RequestMethodCard";
import RequestModalContainer from "@/components/RequestModalContainer";
import ModalStore from "@/store/ModalStore";
import { approveEIP155Request, rejectEIP155Request } from "@/utils/EIP155RequestHandlerUtil";
import { getSignTypedDataParamsData } from "@/utils/HelperUtil";
import { web3wallet } from "@/utils/WalletConnectUtil";
import { Button, Divider, Modal, Text } from "@nextui-org/react";
import { Fragment } from "react";

export default function SessionSignTypedDataModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent;
  const requestSession = ModalStore.state.data?.requestSession;

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>;
  }

  // Get required request data
  const { topic, params } = requestEvent;
  const { request, chainId } = params;

  // Get data
  const data = getSignTypedDataParamsData(request.params);

  // Handle approve action (logic varies based on request method)
  async function onApprove() {
    if (requestEvent) {
      await web3wallet.approveRequest({
        topic,
        id: requestEvent.id,
        result: await approveEIP155Request(requestEvent),
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
        error: rejectEIP155Request(requestEvent),
      });
      ModalStore.close();
    }
  }
  return (
    <Fragment>
      <RequestModalContainer title="Sign Typed Data">
        <ProjectInfoCard metadata={requestSession.peer.metadata} />

        <Divider y={2} />

        <RequesDetailsCard chains={[chainId ?? ""]} protocol={requestSession.relay.protocol} />

        <Divider y={2} />

        <RequestDataCard data={data} />

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
