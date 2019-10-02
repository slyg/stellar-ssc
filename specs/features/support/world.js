const { setWorldConstructor } = require("cucumber");

setWorldConstructor(
  class {
    constructor() {
      this.proceedTx = undefined;
      this.lockTx = undefined;
      this.disputeTx = undefined;
      this.proceedAfterDisputeTx = undefined;
      this.recoverAfterDisputeTx = undefined;

      this.escrow = undefined;

      this.charlieInitialBalance = undefined;
      this.aliceInitialBalance = undefined;

      this.lastTxError = undefined;
    }

    setTransactions(tx) {
      this.proceedTx = tx.proceedTx;
      this.lockTx = tx.lockTx;
      this.disputeTx = tx.disputeTx;
      this.proceedAfterDisputeTx = tx.proceedAfterDisputeTx;
      this.recoverAfterDisputeTx = tx.recoverAfterDisputeTx;
    }

    setEscrowKeypair(keypair) {
      this.escrow = keypair;
    }
  }
);
