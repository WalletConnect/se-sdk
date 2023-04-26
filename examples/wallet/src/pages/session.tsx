import PageHeader from "@/components/PageHeader";
import ProjectInfoCard from "@/components/ProjectInfoCard";
import SessionChainCard from "@/components/SessionChainCard";
import { web3wallet, updateActiveSessions } from "@/utils/WalletConnectUtil";
import { Button, Divider, Loading, Row, Text } from "@nextui-org/react";
import { getSdkError } from "@walletconnect/utils";
import { useRouter } from "next/router";
import { Fragment, useEffect, useState } from "react";
import SettingsStore from "@/store/SettingsStore";
import { EIP155_MAINNET_CHAINS } from "@/data/EIP155Data";
import AccountCard from "@/components/AccountCard";
import { useSnapshot } from "valtio";

/**
 * Component
 */
export default function SessionPage() {
  const [topic, setTopic] = useState("");
  const [updated, setUpdated] = useState(new Date());
  const { query, replace } = useRouter();
  const [loading, setLoading] = useState(false);
  const { eip155Address } = useSnapshot(SettingsStore.state);

  useEffect(() => {
    if (query?.topic) {
      setTopic(query.topic as string);
      SettingsStore.setActiveSession(query.topic as string);
    }
  }, [query]);

  const session = web3wallet.getActiveSessions()?.[topic];

  if (!session) {
    return null;
  }

  // Get necessary data from session
  const expiryDate = new Date(session.expiry * 1000);
  const { namespaces } = session;

  // Handle deletion of a session
  async function onDeleteSession() {
    setLoading(true);
    await web3wallet.disconnectSession({
      topic,
      error: getSdkError("USER_DISCONNECTED"),
    });
    replace("/sessions");
    updateActiveSessions();
    setLoading(false);
  }

  const newNs = {
    eip155: {
      accounts: [
        "eip155:1:0x70012948c348CBF00806A3C79E3c5DAdFaAa347B",
        "eip155:137:0x70012948c348CBF00806A3C79E3c5DAdFaAa347B",
      ],
      methods: [
        "eth_sendTransaction",
        "eth_signTransaction",
        "eth_sign",
        "personal_sign",
        "eth_signTypedData",
      ],
      events: ["chainChanged", "accountsChanged"],
    },
  };

  async function onSessionUpdate() {
    setLoading(true);
    // await web3wallet.updateSession({ topic, namespaces: newNs });
    setUpdated(new Date());
    setLoading(false);
  }

  return (
    <Fragment>
      <PageHeader title="Session Details" />

      <ProjectInfoCard metadata={session.peer.metadata} />

      <Divider y={2} />

      {Object.keys(namespaces).map((chain) => {
        return (
          <Fragment key={chain}>
            <Text h4 css={{ marginBottom: "$5" }}>{`Review ${chain} permissions`}</Text>
            <SessionChainCard namespace={namespaces[chain]} />
            {/* {renderAccountSelection(chain)} */}
            <Divider y={2} />
          </Fragment>
        );
      })}

      <Text h4 css={{ marginBottom: "$5" }}>
        Mainnets
      </Text>
      {Object.values(EIP155_MAINNET_CHAINS).map(({ name, logo, rgb, chainId }) => (
        <AccountCard
          key={name}
          name={name}
          chainId={chainId}
          logo={logo}
          rgb={rgb}
          address={eip155Address}
        />
      ))}

      <Row justify="space-between">
        <Text h5>Expiry</Text>
        <Text css={{ color: "$gray400" }}>{expiryDate.toDateString()}</Text>
      </Row>

      <Row justify="space-between">
        <Text h5>Last Updated</Text>
        <Text css={{ color: "$gray400" }}>{updated.toDateString()}</Text>
      </Row>

      <Row css={{ marginTop: "$10" }}>
        <Button flat css={{ width: "100%" }} color="error" onPress={onDeleteSession}>
          {loading ? <Loading size="sm" color="error" /> : "Delete"}
        </Button>
      </Row>
    </Fragment>
  );
}
