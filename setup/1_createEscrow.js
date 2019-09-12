const { Keypair, TransactionBuilder, Operation } = require("stellar-sdk");
const { charlie } = require("../accounts.json");
const { server, getTxDefaultOptions } = require("../config");
const { BigNumber } = require("bignumber.js");
const fs = require("fs").promises;

const BASE_RESERVE = 0.5;
const NUMBER_OF_ENTRIES = 5; // 5 signees eventually

(async () => {
  const escrowKeyPair = Keypair.random();
  const escrow = {
    publicKey: escrowKeyPair.publicKey(),
    secret: escrowKeyPair.secret()
  };

  const charlieAccount = await server.loadAccount(charlie.publicKey);

  const escrowAccountCreation = {
    destination: escrow.publicKey,
    startingBalance: new BigNumber(
      (2 + NUMBER_OF_ENTRIES) * BASE_RESERVE
    ).toFixed()
  };

  const createEscrowTx = new TransactionBuilder(
    charlieAccount,
    await getTxDefaultOptions()
  )
    .addOperation(Operation.createAccount(escrowAccountCreation))
    .setTimeout(0)
    .build();

  createEscrowTx.sign(Keypair.fromSecret(charlie.secret));

  await Promise.all([
    server.submitTransaction(createEscrowTx),
    fs.writeFile("./escrow.json", JSON.stringify(escrow, null, 2), {
      encoding: "utf8"
    })
  ]);
})().catch(console.log);
