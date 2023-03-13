import ProjectInfoCard from "@/components/ProjectInfoCard";
import RequesDetailsCard from "@/components/RequestDetalilsCard";
import RequestMethodCard from "@/components/RequestMethodCard";
import RequestModalContainer from "@/components/RequestModalContainer";
import ModalStore from "@/store/ModalStore";
import {
  approveEIP155Request,
  rejectEIP155Request,
  signWithEthereum,
} from "@/utils/EIP155RequestHandlerUtil";
import { getSignParamsMessage } from "@/utils/HelperUtil";
import { web3wallet } from "@/utils/WalletConnectUtil";
import { Button, Col, Divider, Modal, Row, Text } from "@nextui-org/react";
import { getSdkError } from "@walletconnect/utils";
import { Fragment, useCallback, useEffect, useState } from "react";
import { eip155Addresses } from "@/utils/EIP155WalletUtil";
import AccountSelectCard from "@/components/AccountSelectCard";

export default function AuthRequestModal() {
  const authRequest = ModalStore.state.data?.authRequest;
  const { params, id } = authRequest;
  const [message, setMessage] = useState<string>();
  const [selectedAdress, setSelectedAddress] = useState<string>(eip155Addresses[0]);
  useEffect(() => {
    if (!authRequest) return;
    setMessage(web3wallet.formatAuthMessage(authRequest.params.cacaoPayload, selectedAdress));
  }, [authRequest?.params.cacaoPayload, selectedAdress, message]);

  const onApprove = useCallback(async () => {
    if (message) {
      const signature = await signWithEthereum(selectedAdress, message);
      await web3wallet.approveAuthRequest({
        id,
        signature,
        address: selectedAdress,
      });
      ModalStore.close();
    }
  }, [selectedAdress, id, message]);

  if (!authRequest) {
    return <Text>Missing authentication request</Text>;
  }

  // Handle reject action
  async function onReject() {
    await web3wallet.rejectAuthRequest({ id, error: getSdkError("USER_REJECTED") });
    ModalStore.close();
  }

  return (
    <Fragment>
      <RequestModalContainer title="Authentication Request">
        <Row>
          <Col>
            <Text h5>Message</Text>
            <Text style={{ whiteSpace: "pre-wrap" }} color="$gray400">
              {message}
            </Text>
          </Col>
        </Row>
        {eip155Addresses.map((address, i) => {
          return (
            <AccountSelectCard
              key={i}
              address={address}
              index={i}
              onSelect={() => setSelectedAddress(address)}
              selected={selectedAdress === address ?? false}
            />
          );
        })}
      </RequestModalContainer>
      <Modal.Footer>
        <Button auto flat color="error" onClick={onReject}>
          Reject
        </Button>
        <Button auto flat color="success" disabled={!selectedAdress} onClick={onApprove}>
          Approve
        </Button>
      </Modal.Footer>
    </Fragment>
  );
}
