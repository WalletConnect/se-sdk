import * as encoding from "@walletconnect/encoding";

export async function formatTestTransaction(account: string, transactionCount: number) {
  const address = account.split(":")[2];
  console.log("transactionCount", transactionCount);
  const nonce = encoding.sanitizeHex(encoding.numberToHex(transactionCount));

  // gasLimit
  const _gasLimit = 21000;
  const gasLimit = encoding.sanitizeHex(encoding.numberToHex(_gasLimit));

  // value
  const _value = 0;
  const value = encoding.sanitizeHex(encoding.numberToHex(_value));

  // const tx = { from: address, to: address, data: "0x", nonce, gasLimit, gasPrice: "", value };

  return {
    from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    to: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    data: "0x",
    nonce: "0x01",
    gasPrice: "0x0afe4146dc",
    gasLimit: "0x5208",
    value: "0x00",
  };
}
