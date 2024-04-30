import ProjectInfoCard from "@/components/ProjectInfoCard";
import RequesDetailsCard from "@/components/RequestDetalilsCard";
import RequestMethodCard from "@/components/RequestMethodCard";
import RequestModalContainer from "@/components/RequestModalContainer";
import { EIP155_CHAINS, EIP155_SIGNING_METHODS } from "@/data/EIP155Data";
import ModalStore from "@/store/ModalStore";
import SettingsStore from "@/store/SettingsStore";
import { eip155Addresses, eip155Wallets } from "@/utils/EIP155WalletUtil";
import { Button, Checkbox, Code, Col, Divider, Grid, Modal, Row } from "@nextui-org/react";
import { getSdkError, buildAuthObject, populateAuthPayload } from "@walletconnect/utils";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { web3wallet } from "@/utils/WalletConnectUtil";

export default function SessionAuthenticateModal() {
  // Get request and wallet data from store
  const authRequest = ModalStore.state.data?.sessionAuthenticate;

  const { account } = useSnapshot(SettingsStore.state);
  const [messages, setMessages] = useState<
    { authPayload: any; message: string; id: number; iss: string }[]
  >([]);
  const [supportedChains] = useState<string[]>(Object.keys(EIP155_CHAINS));
  const [supportedMethods] = useState<string[]>(Object.values(EIP155_SIGNING_METHODS));
  // Ensure request and wallet are defined

  const address = eip155Addresses[account];

  useEffect(() => {
    if (!authRequest?.params.authPayload) return;
    console.log("authRequest", authRequest);
    console.log("supportedChains", supportedChains);
    const newAuthPayload = populateAuthPayload({
      authPayload: authRequest.params.authPayload,
      chains: supportedChains,
      methods: supportedMethods,
    });

    const messagesToSign: any[] = [];
    newAuthPayload.chains.forEach((chain: string) => {
      const iss = `${chain}:${address}`;
      const message = web3wallet.formatAuthMessage({
        payload: newAuthPayload,
        address,
      });
      messagesToSign.push({
        authPayload: newAuthPayload,
        message,
        iss,
        id: authRequest.id,
      });
    });
    setMessages(messagesToSign);
  }, [address, authRequest, supportedChains, supportedMethods]);

  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    if (messages.length) {
      const signedAuths = [];
      for (const message of messages) {
        const signature = await eip155Wallets[address].signMessage(message.message);
        const signedCacao = buildAuthObject(
          message.authPayload,
          {
            t: "eip191",
            s: signature,
          },
          message.iss,
        );
        signedAuths.push(signedCacao);
      }

      await web3wallet.approveSessionAuthenticate({
        id: messages[0].id,
        auths: signedAuths,
      });

      ModalStore.close();
    }
  }, [address, messages]);

  // Handle reject action
  const onReject = useCallback(async () => {
    if (authRequest?.params?.authPayload) {
      await web3wallet.rejectSessionAuthenticate({
        id: authRequest.id,
        reason: getSdkError("USER_REJECTED"),
      });
      ModalStore.close();
    }
  }, [authRequest]);

  return (
    <Fragment>
      <RequestModalContainer title="Sign Message">
        <ProjectInfoCard metadata={authRequest?.params.requester.metadata as any} />

        <Divider y={2} />
        <Row>
          <Col>
            <p>Messages to Sign ({messages.length})</p>
            {messages.map((message, index) => {
              console.log("@loop messageToSign", message);
              return (
                <Code key={index}>
                  <p>{message.message}</p>
                </Code>
              );
            })}
          </Col>
        </Row>
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
