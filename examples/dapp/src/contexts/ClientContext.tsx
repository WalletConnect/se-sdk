import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiGetChainNamespace, ChainsMap } from "caip-api";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import type IEthereumProvider from "@walletconnect/ethereum-provider";
import Client from "@walletconnect/sign-client";

import { DEFAULT_PROJECT_ID } from "../constants";
import { providers, utils } from "ethers";
import {
  AccountBalances,
  ChainNamespaces,
  getAllChainNamespaces,
} from "../helpers";
/**
 * Types
 */
interface IContext {
  client: Client | undefined;
  session: SessionTypes.Struct | undefined;
  connect: (caipChainId: string, pairing?: { topic: string }) => Promise<void>;
  disconnect: () => Promise<void>;
  isInitializing: boolean;
  chain: string;
  pairings: PairingTypes.Struct[];
  accounts: string[];
  balances: AccountBalances;
  isFetchingBalances: boolean;
  chainData: ChainNamespaces;
  web3Provider?: providers.Web3Provider;
  activeAccount: string;
  activeChainId: number;
}

/**
 * Context
 */
export const ClientContext = createContext<IContext>({} as IContext);

/**
 * Provider
 */
/**
 * Provider
 */
export function ClientContextProvider({
  children,
}: {
  children: ReactNode | ReactNode[];
}) {
  const [client, setClient] = useState<Client>();
  const [pairings, setPairings] = useState<PairingTypes.Struct[]>([]);
  const [session, setSession] = useState<SessionTypes.Struct>();

  const [ethereumProvider, setEthereumProvider] = useState<IEthereumProvider>();
  const [web3Provider, setWeb3Provider] = useState<providers.Web3Provider>();

  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasCheckedPersistedSession, setHasCheckedPersistedSession] =
    useState(false);

  const [balances, setBalances] = useState<AccountBalances>({});
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chainData, setChainData] = useState<ChainNamespaces>({});
  const [chain, setChain] = useState<string>("");
  const [activeChainId, setActiveChainId] = useState<number>();
  const [activeAccount, setActiveAccount] = useState<string>();

  const resetApp = () => {
    setPairings([]);
    setSession(undefined);
    setBalances({});
    setAccounts([]);
    setChain("");
  };

  const loadChainData = async () => {
    const namespaces = getAllChainNamespaces();
    const chainData: ChainNamespaces = {};
    await Promise.all(
      namespaces.map(async (namespace) => {
        let chains: ChainsMap | undefined;
        try {
          chains = await apiGetChainNamespace(namespace);
        } catch (e) {
          // ignore error
        }
        if (typeof chains !== "undefined") {
          chainData[namespace] = chains;
        }
      })
    );
    setChainData(chainData);
  };

  const disconnect = useCallback(async () => {
    if (typeof ethereumProvider === "undefined") {
      throw new Error("ethereumProvider is not initialized");
    }
    await ethereumProvider.disconnect();
    resetApp();
  }, [ethereumProvider]);

  const _subscribeToProviderEvents = useCallback(
    async (_client: IEthereumProvider) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }

      _client.on("display_uri", async (uri: string) => {
        console.log("EVENT", "QR Code Modal open", uri);
      });

      // Subscribe to session event
      _client.on("session_event", (payload) => {
        console.log("EVENT", "session_event", payload);
      });

      // Subscribe to session update
      _client.on("session_update", (payload) => {
        console.log("EVENT", "session_updated", payload);
      });

      _client.on("chainChanged", async (payload) => {
        console.log("EVENT", "chainChanged", payload);
        setActiveChainId(parseInt(payload, 16));
        console.log("activeChainId", await web3Provider?.getNetwork());
      });

      _client.on("accountsChanged", (payload) => {
        const address = payload[0];
        console.log("EVENT", "accountsChanged", address);
        setActiveAccount(address);
        if (!accounts.includes(address)) {
          accounts.push(address);
          setAccounts(accounts);
        }
      });

      // Subscribe to session delete
      _client.on("session_delete", (payload) => {
        console.log("EVENT", "session_deleted", payload);
        resetApp();
      });
    },
    [accounts, web3Provider]
  );

  const createClient = useCallback(async () => {
    try {
      setIsInitializing(true);

      const provider = await EthereumProvider.init({
        projectId: DEFAULT_PROJECT_ID || "",
        chains: [1],
        methods: [
          "eth_sendTransaction",
          "eth_signTransaction",
          "eth_sign",
          "personal_sign",
          "eth_signTypedData",
        ],
      });
      setEthereumProvider(provider);
      setClient(provider.signer.client);
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const createWeb3Provider = useCallback(
    (ethereumProvider: IEthereumProvider) => {
      const web3Provider = new providers.Web3Provider(ethereumProvider, "any");
      setWeb3Provider(web3Provider);
    },
    []
  );

  const connect = useCallback(
    async (caipChainId: string, pairing?: { topic: string }) => {
      if (!ethereumProvider) {
        throw new ReferenceError("WalletConnect Client is not initialized.");
      }

      const chainId = caipChainId.split(":").pop();

      console.log("Enabling EthereumProvider for chainId: ", chainId);

      const chain = parseInt(chainId?.split(":")[1] || "1");
      await ethereumProvider.connect({
        chains: [chain],
      });

      createWeb3Provider(ethereumProvider);
      const _accounts = await ethereumProvider.enable();
      console.log("_accounts", _accounts);
      setAccounts(_accounts);
      setActiveAccount(_accounts[0]);
      setActiveChainId(chain);
      setSession(ethereumProvider.session);
      setChain(caipChainId);
    },
    [ethereumProvider, createWeb3Provider]
  );

  const onSessionConnected = useCallback(
    async (_session: SessionTypes.Struct) => {
      if (!ethereumProvider) {
        throw new ReferenceError("EthereumProvider is not initialized.");
      }
      const allNamespaceAccounts = Object.values(_session.namespaces)
        .map((namespace) => namespace.accounts)
        .flat();
      const allNamespaceChains = Object.keys(_session.namespaces);

      const chainData = allNamespaceAccounts[0].split(":");
      const caipChainId = `${chainData[0]}:${chainData[1]}`;
      console.log("restored caipChainId", caipChainId);
      setChain(caipChainId);
      setSession(_session);
      setAccounts(allNamespaceAccounts.map((account) => account.split(":")[2]));
      console.log("RESTORED", allNamespaceChains, allNamespaceAccounts);
      createWeb3Provider(ethereumProvider);
    },
    [ethereumProvider, createWeb3Provider]
  );

  const _checkForPersistedSession = useCallback(
    async (provider: IEthereumProvider) => {
      if (typeof provider === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      const pairings = provider.signer.client.pairing.getAll({ active: true });
      // populates existing pairings to state
      setPairings(pairings);
      console.log("RESTORED PAIRINGS: ", pairings);
      if (typeof session !== "undefined") return;
      // populates (the last) existing session to state
      if (ethereumProvider?.session) {
        const _session = ethereumProvider?.session;
        console.log("RESTORED SESSION:", _session);
        await onSessionConnected(_session);
        setActiveChainId(ethereumProvider.chainId);
        setActiveAccount(ethereumProvider.accounts[0]);
        return _session;
      }
    },
    [session, ethereumProvider, onSessionConnected]
  );

  useEffect(() => {
    loadChainData();
  }, []);

  useEffect(() => {
    if (!client) {
      createClient();
    }
  }, [client, createClient]);

  useEffect(() => {
    if (ethereumProvider) _subscribeToProviderEvents(ethereumProvider);
  }, [_subscribeToProviderEvents, ethereumProvider]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!web3Provider || !accounts) return;

      try {
        setIsFetchingBalances(true);
        const _balances = await Promise.all(
          accounts.map(async (account) => {
            const balance = await web3Provider.getBalance(account);
            return {
              account,
              symbol: "ETH",
              balance: utils.formatEther(balance),
              contractAddress: "",
            };
          })
        );

        const balancesByAccount = _balances.reduce((obj, balance) => {
          obj[balance.account] = balance;
          return obj;
        }, {} as AccountBalances);

        setBalances(balancesByAccount);
      } catch (error: any) {
        throw new Error(error);
      } finally {
        setIsFetchingBalances(false);
      }
    };

    fetchBalances();
  }, [web3Provider, accounts]);

  useEffect(() => {
    const getPersistedSession = async () => {
      if (!ethereumProvider) return;
      await _checkForPersistedSession(ethereumProvider);
      setHasCheckedPersistedSession(true);
    };

    if (ethereumProvider && chainData && !hasCheckedPersistedSession) {
      getPersistedSession();
    }
  }, [
    ethereumProvider,
    chainData,
    _checkForPersistedSession,
    hasCheckedPersistedSession,
  ]);

  const value = useMemo(
    () => ({
      pairings,
      isInitializing,
      balances,
      isFetchingBalances,
      accounts,
      chain,
      client,
      session,
      disconnect,
      connect,
      chainData,
      web3Provider,
      activeAccount,
      activeChainId,
    }),
    [
      pairings,
      isInitializing,
      balances,
      isFetchingBalances,
      accounts,
      chain,
      client,
      session,
      disconnect,
      connect,
      chainData,
      web3Provider,
      activeAccount,
      activeChainId,
    ]
  );

  return (
    <ClientContext.Provider
      value={{
        ...value,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useWalletConnectClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error(
      "useWalletConnectClient must be used within a ClientContextProvider"
    );
  }
  return context;
}
