const { Account, TransactionBuilder, Operation } = require("stellar-sdk");
const fs = require("fs").promises;
const { charlie, alice, maria } = require("../accounts.json");
const {
  server,
  getTxDefaultOptions,
  LOCKUP_PERIOD_IN_SEC
} = require("../config");
const escrow = require("../escrow.json");
const { BigNumber } = require("bignumber.js");

const now = new BigNumber(Math.floor(Date.now())).dividedToIntegerBy(1000);
const unlockPeriodEnd = now.plus(LOCKUP_PERIOD_IN_SEC);

/*
 * Tx 4b
 * -----
 *
 * Refund Alice after dispute
 *
 */

const createRecoverAfterDisputeTx = ({
  escrowAccountCurrentSequence,
  txDefaultOptions
}) => {
  const SEQUENCE_NUMBER_SHIFT = 2;

  const escrowAccount = new Account(
    escrow.publicKey,
    new BigNumber(escrowAccountCurrentSequence)
      .plus(SEQUENCE_NUMBER_SHIFT)
      .valueOf()
  );

  return new TransactionBuilder(escrowAccount, txDefaultOptions)
    .addOperation(Operation.accountMerge({ destination: alice.publicKey }))
    .setTimeout(0)
    .build();
};

/*
 * Tx 4a
 * -----
 *
 * Proceed with payment to Charlie after dispute
 *
 */

const createProceedAfterDisputeTx = ({
  escrowAccountCurrentSequence,
  txDefaultOptions
}) => {
  const SEQUENCE_NUMBER_SHIFT = 2;

  const escrowAccount = new Account(
    escrow.publicKey,
    new BigNumber(escrowAccountCurrentSequence)
      .plus(SEQUENCE_NUMBER_SHIFT)
      .valueOf()
  );

  return new TransactionBuilder(escrowAccount, txDefaultOptions)
    .addOperation(Operation.accountMerge({ destination: charlie.publicKey }))
    .setTimeout(0)
    .build();
};

/*
 * Tx 3b
 * -----
 *
 * Trigger a dispute and change the account's signees,
 * using Tx4a/b as signees as well
 *
 */

const createDisputeTx = ({
  escrowAccountCurrentSequence,
  txDefaultOptions,
  proceedAfterDisputeTx,
  recoverAfterDisputeTx
}) => {
  const SEQUENCE_NUMBER_SHIFT = 1;

  const escrowAccount = new Account(
    escrow.publicKey,
    new BigNumber(escrowAccountCurrentSequence)
      .plus(SEQUENCE_NUMBER_SHIFT)
      .valueOf()
  );

  // Signers and thresholds:
  // -----------------------
  // to add to the threshold weight of 3,
  // maria's signature (weight 2) is needed
  // as well as one of the post-dispute transactions (weight 1)

  return new TransactionBuilder(escrowAccount, txDefaultOptions)
    .addOperation(
      Operation.setOptions({
        signer: {
          ed25519PublicKey: maria.publicKey,
          weight: 2
        }
      })
    )
    .addOperation(
      Operation.setOptions({
        signer: {
          preAuthTx: proceedAfterDisputeTx.hash(),
          weight: 1
        }
      })
    )
    .addOperation(
      Operation.setOptions({
        signer: {
          preAuthTx: recoverAfterDisputeTx.hash(),
          weight: 1
        }
      })
    )
    .addOperation(
      Operation.setOptions({
        masterWeight: 0,
        lowThreshold: 3,
        medThreshold: 3,
        highThreshold: 3
      })
    )
    .setTimeout(0)
    .build();
};

/*
 * Tx 3a
 * -----
 *
 * Proceed with the payment AFTER the lockup period
 *
 */

const createProceedTx = ({
  escrowAccountCurrentSequence,
  txDefaultOptions
}) => {
  const SEQUENCE_NUMBER_SHIFT = 1;

  const escrowAccount = new Account(
    escrow.publicKey,
    new BigNumber(escrowAccountCurrentSequence)
      .plus(SEQUENCE_NUMBER_SHIFT)
      .valueOf()
  );

  const txOptions = {
    ...txDefaultOptions,
    timebounds: {
      minTime: unlockPeriodEnd.toNumber(),
      maxTime: 0
    }
  };

  return new TransactionBuilder(escrowAccount, txOptions)
    .addOperation(Operation.accountMerge({ destination: charlie.publicKey }))
    .setTimeout(0)
    .build();
};

/*
 * Tx 2
 * -----
 *
 * Lockup the escrow account and add the signees
 *
 */

const createLockTx = ({
  escrowAccountCurrentSequence,
  txDefaultOptions,
  proceedTx,
  disputeTx
}) => {
  const SEQUENCE_NUMBER_SHIFT = 0;

  const escrowAccount = new Account(
    escrow.publicKey,
    new BigNumber(escrowAccountCurrentSequence)
      .plus(SEQUENCE_NUMBER_SHIFT)
      .valueOf()
  );

  return new TransactionBuilder(escrowAccount, txDefaultOptions)
    .addOperation(
      Operation.setOptions({
        signer: {
          ed25519PublicKey: charlie.publicKey,
          weight: 1
        }
      })
    )
    .addOperation(
      Operation.setOptions({
        signer: {
          ed25519PublicKey: alice.publicKey,
          weight: 1
        }
      })
    )
    .addOperation(
      Operation.setOptions({
        signer: {
          preAuthTx: proceedTx.hash(),
          weight: 1
        }
      })
    )
    .addOperation(
      Operation.setOptions({
        signer: {
          preAuthTx: disputeTx.hash(),
          weight: 1
        }
      })
    )
    .addOperation(
      Operation.setOptions({
        masterWeight: 0,
        lowThreshold: 2,
        medThreshold: 2,
        highThreshold: 2
      })
    )
    .setTimeout(0)
    .build();
};

/*
 * Wrap up all transactions in sequence.
 */

(async () => {
  const { sequence: escrowAccountCurrentSequence } = await server.loadAccount(
    escrow.publicKey
  );

  const txDefaultOptions = await getTxDefaultOptions();

  const recoverAfterDisputeTx = createRecoverAfterDisputeTx({
    escrowAccountCurrentSequence,
    txDefaultOptions
  });

  const proceedAfterDisputeTx = createProceedAfterDisputeTx({
    escrowAccountCurrentSequence,
    txDefaultOptions
  });

  const disputeTx = createDisputeTx({
    escrowAccountCurrentSequence,
    txDefaultOptions,
    proceedAfterDisputeTx,
    recoverAfterDisputeTx
  });

  const proceedTx = createProceedTx({
    escrowAccountCurrentSequence,
    txDefaultOptions
  });

  const lockTx = createLockTx({
    escrowAccountCurrentSequence,
    txDefaultOptions,
    proceedTx,
    disputeTx
  });

  const txXDR = [
    ["recoverAfterDisputeTx", recoverAfterDisputeTx],
    ["proceedAfterDisputeTx", proceedAfterDisputeTx],
    ["disputeTx", disputeTx],
    ["proceedTx", proceedTx],
    ["lockTx", lockTx]
  ].reduce(
    (acc, [txName, tx]) => ({
      ...acc,
      [txName]: tx.toEnvelope().toXDR("base64")
    }),
    {}
  );

  await fs.writeFile(`./txXDR.json`, JSON.stringify(txXDR, null, 2), {
    encoding: "utf8"
  });
})().catch(console.log);
