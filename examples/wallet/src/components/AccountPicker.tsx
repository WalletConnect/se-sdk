import SettingsStore from "@/store/SettingsStore";
import { eip155Addresses } from "@/utils/EIP155WalletUtil";
import { useSnapshot } from "valtio";
import { web3wallet } from "@/utils/WalletConnectUtil";

export default function AccountPicker() {
  const { account, activeChainId, activeSession } = useSnapshot(
    SettingsStore.state
  );

  function onSelect(value: string) {
    const account = Number(value);
    SettingsStore.setAccount(account);
    SettingsStore.setEIP155Address(eip155Addresses[account]);
    web3wallet.updateSession({
      accounts: [eip155Addresses[account]],
      chainId: activeChainId,
      topic: activeSession,
    });
  }

  return (
    <select
      value={account}
      onChange={(e) => onSelect(e.currentTarget.value)}
      aria-label="addresses"
    >
      <option value={0}>Account 1</option>
      <option value={1}>Account 2</option>
    </select>
  );
}
