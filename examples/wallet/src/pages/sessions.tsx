import PageHeader from "@/components/PageHeader";
import SessionCard from "@/components/SessionCard";
import { web3wallet } from "@/utils/WalletConnectUtil";
import { Text } from "@nextui-org/react";
import { Fragment } from "react";

export default function SessionsPage() {
  const sessions = web3wallet.getActiveSessions();
  const sessionTopics = Object.keys(sessions);

  if (!sessionTopics.length) {
    return (
      <Fragment>
        <PageHeader title="Sessions" />
        <Text css={{ opacity: "0.5", textAlign: "center", marginTop: "$20" }}>No sessions</Text>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <PageHeader title="Sessions" />
      {sessionTopics.length
        ? sessionTopics.map((topic) => {
            const { name, icons, url } = sessions[topic].peer.metadata;
            return <SessionCard key={topic} topic={topic} name={name} logo={icons[0]} url={url} />;
          })
        : null}
    </Fragment>
  );
}
