const fs = require("fs").promises;
const {
  Asset,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  xdr
} = require("stellar-sdk");
const { server, TRANSACTION_AMOUNT_IN_XLM } = require("../../../config");
const { alice } = require("../../../accounts.json");

exports.loadTx = txXDR =>
  Object.keys(txXDR)
    .map(prop => [
      prop,
      new Transaction(
        xdr.TransactionEnvelope.fromXDR(txXDR[prop], "base64"),
        Networks.TESTNET
      )
    ])
    .reduce(
      (acc, [txName, tx]) => ({
        ...acc,
        [txName]: tx
      }),
      {}
    );

const loadJSON = async filename =>
  JSON.parse(
    await fs.readFile(filename, {
      encoding: "utf8"
    })
  );

exports.loadJSON = loadJSON;

exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.aliceFundsEscrow = async amount => {
  const escrow = await loadJSON("./escrow.json");
  const aliceAccount = await server.loadAccount(alice.publicKey);

  const txOptions = {
    fee: await server.fetchBaseFee(),
    networkPassphrase: Networks.TESTNET
  };

  const paymentToEscrow = {
    amount: amount.toString(),
    asset: Asset.native(),
    destination: escrow.publicKey
  };

  const tx = new TransactionBuilder(aliceAccount, txOptions)
    .addOperation(Operation.payment(paymentToEscrow))
    .setTimeout(0)
    .build();

  tx.sign(Keypair.fromSecret(alice.secret));

  await server.submitTransaction(tx);
};

exports.getBalanceOf = async keyPair => {
  const { balances } = await server.loadAccount(keyPair.publicKey);
  return balances.find(({ asset_type }) => asset_type === "native").balance;
};
