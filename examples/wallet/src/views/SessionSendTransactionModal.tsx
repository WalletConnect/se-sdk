import ProjectInfoCard from "@/components/ProjectInfoCard";
import RequestDataCard from "@/components/RequestDataCard";
import RequesDetailsCard from "@/components/RequestDetalilsCard";
import RequestMethodCard from "@/components/RequestMethodCard";
import RequestModalContainer from "@/components/RequestModalContainer";
import ModalStore from "@/store/ModalStore";
import {
  approveEIP155Request,
  rejectEIP155Request,
} from "@/utils/EIP155RequestHandlerUtil";
import { web3wallet } from "@/utils/WalletConnectUtil";
import { ErrorResponse } from "@json-rpc-tools/utils";
import { Button, Divider, Loading, Modal, Text } from "@nextui-org/react";
import { getSdkError } from "@walletconnect/utils";
import { Fragment, useState } from "react";

export default function SessionSendTransactionModal() {
  const [loading, setLoading] = useState(false);

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent;
  const requestSession = ModalStore.state.data?.requestSession;

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>;
  }

  // Get required proposal data

  const { topic, params } = requestEvent;
  const { request, chainId } = params;
  const transaction = request.params[0];

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
        error: getSdkError("USER_REJECTED_METHODS"),
      });
      ModalStore.close();
    }
  }

  return (
    <Fragment>
      <RequestModalContainer title="Send / Sign Transaction">
        <ProjectInfoCard metadata={requestSession.peer.metadata} />

        <Divider y={2} />

        <RequestDataCard data={transaction} />

        <Divider y={2} />

        <RequesDetailsCard
          chains={[chainId ?? ""]}
          protocol={requestSession.relay.protocol}
        />

        <Divider y={2} />

        <RequestMethodCard methods={[request.method]} />
      </RequestModalContainer>

      <Modal.Footer>
        <Button auto flat color="error" onPress={onReject} disabled={loading}>
          Reject
        </Button>
        <Button
          auto
          flat
          color="success"
          onPress={onApprove}
          disabled={loading}
        >
          {loading ? <Loading size="sm" color="success" /> : "Approve"}
        </Button>
      </Modal.Footer>
    </Fragment>
  );
}
