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

  const tx = { from: address, to: address, data: "0x", nonce, gasLimit, gasPrice: "", value };

  return tx;
}
