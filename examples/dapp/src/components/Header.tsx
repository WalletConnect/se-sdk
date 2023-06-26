import { SessionTypes } from "@walletconnect/types";
import * as React from "react";
import styled from "styled-components";

import { colors, fonts, responsive } from "../styles";
import Button from "./Button";
import { EIP155Metadata, getChainMetadata } from "../chains/eip155";
import IEthereumProvider from "@walletconnect/ethereum-provider";
import { useCallback, useMemo } from "react";
import ChainSwitchModal from "../modals/ChainSwitchModal";

const SHeader = styled.div`
  margin-top: -1px;
  margin-bottom: 1px;
  width: 100%;
  height: 100px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  @media screen and (${responsive.sm.max}) {
    font-size: ${fonts.size.small};
  }
`;

const SHeaderActions = styled.div`
  display: flex;
  & > button {
    margin-right: 10px !important;
  }
`;

const SActiveAccount = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  font-weight: 500;
`;

const SActiveSession = styled(SActiveAccount as any)`
  flex-direction: column;
  text-align: left;
  align-items: flex-start;
  & p {
    font-size: 0.8em;
    margin: 0;
    padding: 0;
  }
  & p:nth-child(n + 2) {
    font-weight: bold;
  }
`;

interface SelectStyleProps {
  rgb?: string;
}

const SSelect = styled.select<SelectStyleProps>`
  margin-right: 10px;
  position: relative;
  box-sizing: border-box;
  border-radius: 8px;
  border: ${({ rgb }) => `2px solid rgb(${rgb || colors.purple})`};
  color: ${({ rgb }) => `rgb(${rgb || colors.purple})`};
  font-size: ${fonts.size.medium};
  font-weight: ${fonts.weight.semibold};
`;

interface HeaderProps {
  ping: () => Promise<void>;
  disconnect: () => Promise<void>;
  session: SessionTypes.Struct | undefined;
  ethereumProvider?: IEthereumProvider;
}

const Header = (props: HeaderProps) => {
  const { ping, disconnect, session, ethereumProvider } = props;
  const [selectedChain, setSelectedChain] = React.useState<string>();
  const [chainSwitchError, setChainSwitchErr] = React.useState<string>();
  const chain = useMemo(() => {
    if (!ethereumProvider) {
      return;
    }
    setSelectedChain(ethereumProvider?.chainId.toString());
    return getChainMetadata(`eip155:${ethereumProvider.chainId}`);
  }, [ethereumProvider?.chainId]);

  const switchChain = useCallback(
    async (chain: string) => {
      console.log(`switching to chain ${chain}`);
      setChainSwitchErr("");
      await ethereumProvider
        ?.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chain }],
        })
        .catch((e) => {
          console.error(e);
          setChainSwitchErr(e.message);
        });
      setSelectedChain(parseInt(chain, 16).toString());
    },
    [ethereumProvider],
  );

  return (
    <>
      <SHeader {...props}>
        {session ? (
          <>
            <SActiveSession>
              <p>{`Connected to`}</p>
              <p>{session.peer.metadata.name}</p>
            </SActiveSession>
            <SHeaderActions>
              <SSelect
                placeholder="chains"
                rgb={chain?.rgb}
                onChange={(e) => switchChain(e.target.value)}
              >
                {Object.keys(EIP155Metadata).map((chainId) => {
                  return (
                    <option
                      selected={selectedChain === chainId}
                      value={Number(chainId).toString(16)}
                    >
                      eip155:{chainId}
                      {selectedChain === chainId ? (chainSwitchError ? " ❌" : " ✅") : ""}
                    </option>
                  );
                })}
                <p>{chainSwitchError}</p>
              </SSelect>
              <Button outline color="black" onClick={ping}>
                {"Ping"}
              </Button>
              <Button outline color="red" onClick={disconnect}>
                {"Disconnect"}
              </Button>
            </SHeaderActions>
          </>
        ) : null}
      </SHeader>
      <ChainSwitchModal result={chainSwitchError} />
    </>
  );
};

export default Header;
