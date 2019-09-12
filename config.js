const { Server, Networks } = require("stellar-sdk");

const server = new Server("https://horizon-testnet.stellar.org");

const getTxDefaultOptions = async () => ({
  fee: await server.fetchBaseFee(),
  networkPassphrase: Networks.TESTNET
});

const LOCKUP_PERIOD_IN_SEC = 20;
const TRANSACTION_AMOUNT_IN_XLM = "100";

module.exports = {
  server,
  getTxDefaultOptions,
  LOCKUP_PERIOD_IN_SEC,
  TRANSACTION_AMOUNT_IN_XLM
};
