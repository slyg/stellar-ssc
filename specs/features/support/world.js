const { setWorldConstructor } = require("cucumber");

class CustomWorld {
  constructor() {
    this.escrow = undefined;
    this.proceedTx = undefined;
    this.lockTx = undefined;
    this.disputeTx = undefined;
    this.proceedAfterDisputeTx = undefined;
    this.recoverAfterDisputeTx = undefined;
    this.charlieInitialBalance = undefined;
    this.aliceInitialBalance = undefined;
    this.lastTxError = undefined;
  }
}

setWorldConstructor(CustomWorld);
