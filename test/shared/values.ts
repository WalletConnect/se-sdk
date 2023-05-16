export const TEST_ETHEREUM_CHAIN = "eip155:1";
export const TEST_ARBITRUM_CHAIN = "eip155:42161";
export const TEST_AVALANCHE_CHAIN = "eip155:43114";

export const TEST_GOERLI_CHAIN_PARSED = 5;

export const TEST_CHAINS = [TEST_ETHEREUM_CHAIN, TEST_ARBITRUM_CHAIN, TEST_AVALANCHE_CHAIN];
export const TEST_METHODS = [
  "eth_signTransaction",
  "eth_sendTransaction",
  "personal_sign",
  "eth_signTypedData",
];
export const TEST_OPTIONAL_METHODS = ["wallet_addEthereumChain", "wallet_switchEthereumChain"];
export const TEST_EVENTS = ["chainChanged", "accountsChanged"];

export const TEST_ETHEREUM_ADDRESS = "0x3c582121909DE92Dc89A36898633C1aE4790382b";

export const TEST_ETHEREUM_ACCOUNT = `${TEST_ETHEREUM_CHAIN}:${TEST_ETHEREUM_ADDRESS}`;
export const TEST_ARBITRUM_ACCOUNT = `${TEST_ARBITRUM_CHAIN}:${TEST_ETHEREUM_ADDRESS}`;
export const TEST_AVALANCHE_ACCOUNT = `${TEST_AVALANCHE_CHAIN}:${TEST_ETHEREUM_ADDRESS}`;
export const TEST_GOERLI_ACCOUNT = `eip155:${TEST_GOERLI_CHAIN_PARSED}:${TEST_ETHEREUM_ADDRESS}`;

export const TEST_ACCOUNTS = [TEST_ETHEREUM_ACCOUNT, TEST_ARBITRUM_ACCOUNT, TEST_AVALANCHE_ACCOUNT];

export const TEST_NAMESPACES = {
  eip155: {
    methods: [TEST_METHODS[0]],
    accounts: [TEST_ACCOUNTS[0]],
    events: [TEST_EVENTS[0]],
  },
};

export const TEST_UPDATED_NAMESPACES = {
  eip155: {
    methods: TEST_METHODS,
    accounts: [TEST_ETHEREUM_ACCOUNT, TEST_GOERLI_ACCOUNT],
    events: TEST_EVENTS,
  },
};

export const TEST_REQUIRED_NAMESPACES = {
  eip155: {
    methods: TEST_METHODS,
    chains: [TEST_ETHEREUM_CHAIN],
    events: TEST_EVENTS,
  },
};

export const TEST_OPTIONAL_NAMESPACES = {
  eip155: {
    methods: TEST_OPTIONAL_METHODS,
    chains: [TEST_ETHEREUM_CHAIN],
    events: [],
  },
};

export const TEST_CORE_OPTIONS = {
  projectId: process.env.TEST_PROJECT_ID || "",
  logger: "error",
  relayUrl: process.env.TEST_RELAY_URL || "",
};

export const TEST_ETHEREUM_CHAIN_PARSED = 1;

export const TEST_APPROVE_PARAMS = {
  chainId: TEST_ETHEREUM_CHAIN_PARSED,
  accounts: [TEST_ETHEREUM_ADDRESS],
};
