const { Given, When, Then } = require("cucumber");
const { expect } = require("chai");
const { BigNumber } = require("bignumber.js");
const {
  Keypair,
  Networks,
  Operation,
  TransactionBuilder
} = require("stellar-sdk");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { server } = require("../../../config");
const {
  loadTx,
  loadJSON,
  sleep,
  aliceFundsEscrow,
  getBalanceOf
} = require("./lib");
const { alice, charlie, maria } = require("../../../accounts.json");

Given(/^Charlie and Alice have a balance$/, { timeout: 20000 }, async () => {
  this.charlieInitialBalance = await getBalanceOf(charlie);
  this.aliceInitialBalance = await getBalanceOf(alice);
  expect(new BigNumber(this.charlieInitialBalance).isGreaterThan(500));
  expect(new BigNumber(this.aliceInitialBalance).isGreaterThan(500));
});

When(/^Charlie creates the contract$/, { timeout: 40000 }, async () => {
  await exec("node ./setup/1_createEscrow.js");
  const escrow = await loadJSON("./escrow.json");

  await exec("node ./setup/2_createTx.js");
  const txXDR = await loadJSON("./txXDR.json");
  const tx = loadTx(txXDR);
  this.proceedTx = tx.proceedTx;
  this.lockTx = tx.lockTx;
  this.disputeTx = tx.disputeTx;
  this.proceedAfterDisputeTx = tx.proceedAfterDisputeTx;
  this.recoverAfterDisputeTx = tx.recoverAfterDisputeTx;

  this.lockTx.sign(Keypair.fromSecret(escrow.secret));
  try {
    await server.submitTransaction(this.lockTx);
  } catch (e) {
    console.error(e.response.data.extras.result_codes);
    throw e;
  }
});

When(
  /^Alice funds the escrow account with (.*) XLM$/,
  { timeout: 20000 },
  async amount => {
    await aliceFundsEscrow(amount);
  }
);

When(/^I wait for (.*) seconds$/, { timeout: 60000 }, async seconds => {
  await sleep((Number(seconds) + 1) * 1000);
});

When(
  /^Alice signs and submits the "proceed" transaction$/,
  { timeout: 20000 },
  async () => {
    this.proceedTx.sign(Keypair.fromSecret(alice.secret));
    try {
      await server.submitTransaction(this.proceedTx);
    } catch (e) {
      console.error(e.response.data.extras.result_codes);
    }
  }
);

When(
  /^Charlie signs and submits the "proceed" transaction$/,
  { timeout: 20000 },
  async () => {
    this.proceedTx.sign(Keypair.fromSecret(charlie.secret));
    try {
      await server.submitTransaction(this.proceedTx);
    } catch (e) {
      this.lastTxError = e.response
        ? e.response.data.extras.result_codes.transaction
        : e;
    }
  }
);

When(/^Alice raises a dispute$/, { timeout: 20000 }, async () => {
  this.disputeTx.sign(Keypair.fromSecret(alice.secret));
  try {
    await server.submitTransaction(this.disputeTx);
  } catch (e) {
    this.lastTxError = e.response
      ? e.response.data.extras.result_codes.transaction
      : e;
  }
});

When(
  /^Alice signs and submits a "withdrawal" transaction$/,
  { timeout: 20000 },
  async () => {
    const escrowAccount = await server.loadAccount(this.escrow.publicKey);

    const txOptions = {
      fee: await server.fetchBaseFee(),
      networkPassphrase: Networks.TESTNET
    };

    const tx = new TransactionBuilder(escrowAccount, txOptions)
      .addOperation(Operation.accountMerge({ destination: alice.publicKey }))
      .setTimeout(0)
      .build();

    tx.sign(Keypair.fromSecret(alice.secret));

    try {
      await server.submitTransaction(tx);
    } catch (e) {
      this.lastTxError = e.response
        ? e.response.data.extras.result_codes.transaction
        : e;
    }
  }
);

When(
  /^Charlie signs and submits a "withdrawal" transaction with the escrow key$/,
  { timeout: 20000 },
  async () => {
    const escrow = await loadJSON("./escrow.json");
    const escrowAccount = await server.loadAccount(escrow.publicKey);

    const txOptions = {
      fee: await server.fetchBaseFee(),
      networkPassphrase: Networks.TESTNET
    };

    const tx = new TransactionBuilder(escrowAccount, txOptions)
      .addOperation(Operation.accountMerge({ destination: charlie.publicKey }))
      .setTimeout(0)
      .build();

    tx.sign(Keypair.fromSecret(escrow.secret));

    try {
      await server.submitTransaction(tx);
    } catch (e) {
      this.lastTxError = e.response
        ? e.response.data.extras.result_codes.transaction
        : e;
    }
  }
);

When(
  /^Maria signs and submits the "proceed after dispute" transaction$/,
  { timeout: 20000 },
  async () => {
    this.proceedAfterDisputeTx.sign(Keypair.fromSecret(maria.secret));
    try {
      await server.submitTransaction(this.proceedAfterDisputeTx);
    } catch (e) {
      this.lastTxError = e.response
        ? e.response.data.extras.result_codes.transaction
        : e;
    }
  }
);

When(
  /^Maria signs and submits the "recover after dispute" transaction$/,
  { timeout: 20000 },
  async () => {
    this.recoverAfterDisputeTx.sign(Keypair.fromSecret(maria.secret));
    try {
      await server.submitTransaction(this.recoverAfterDisputeTx);
    } catch (e) {
      this.lastTxError = e.response
        ? e.response.data.extras.result_codes.transaction
        : e;
    }
  }
);

Then(
  /^Charlie should have received a payment of (.*) XLM$/,
  { timeout: 20000 },
  async amount => {
    const balanceOfCharlieAfter = await getBalanceOf(charlie);
    expect(
      new BigNumber(balanceOfCharlieAfter)
        .minus(new BigNumber(this.charlieInitialBalance))
        .integerValue()
        .toFixed()
    ).to.equal(amount);
  }
);

Then(/^Alice's balance should be restored$/, { timeout: 20000 }, async () => {
  const balanceOfAliceAfter = await getBalanceOf(alice);
  expect(
    new BigNumber(balanceOfAliceAfter)
      .minus(new BigNumber(this.aliceInitialBalance))
      .integerValue()
      .toNumber()
  ).to.be.lessThan(5);
});

Then(
  /^Charlie should not have received any payment$/,
  { timeout: 20000 },
  async () => {
    const balanceOfCharlieAfter = await getBalanceOf(charlie);
    expect(
      new BigNumber(this.charlieInitialBalance)
        .minus(new BigNumber(balanceOfCharlieAfter))
        .integerValue()
        .toNumber()
    ).to.be.lessThan(5);
  }
);

Then(
  /^The payment should be rejected with a "(.*)" message$/,
  { timeout: 20000 },
  errorCode => {
    expect(this.lastTxError).to.equal(errorCode);
  }
);
