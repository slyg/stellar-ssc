Alice (customer)
Charlie (contractor)
Maria (mediator)

## Scenario:

- Alice wants to build a swimming-pool in her garden (lucky her!)
- Alice contacts several contractors for quotes
- _Charlie the contractor_ draws up a quote (price and duration)
- Alice chooses Charlie's quote (price and duration)
- Alice and Charlie both agree to name _Maria the mediator_ as the mediator for this agreement

## Contract content

Charlie will start the work if:

- Alice has locked at least the quoted amount in an escrow
- Alice cannot withdraw the escrowed amount before the estimated duration
- His signature is necessary to release the funds after completion
- He can raise a dispute if Alice doesn't release the funds in his favor
- Maria the mediator can never access the funds

Alice will accept to lock the funds if:

- Her signature is necessary to withdraw the funds in favor of Charlie after completion
- The funds are locked up at least until the estimate end date
- She can raise a dispute to recover the funds et any time till the unlock date
- Maria the mediator can never access the funds at any time

Maria the Mediator

If Alice raises a dispute:

- Can sign a fund recovery in favor or Alice
- Or can sign a fund release in favor of Charlie

## Contract implementation

### 1. Charlie creates the escrow account

Charlie having created the Escrow account, he knows the private key.

### 2. Charlie creates the escrow transactions

#### Tx3a: Proceed to payment

Escrow account merged into Charlie's

- seqNumber: N + 1
- content: account merge
- timebound: unlock time
- eventual signers:
  - Alice
  - Charlie

#### Tx4a: Proceed to payment after dispute

Escrow account account merged into Charlie's

- seqNumber: N + 2
- content: account merge

#### Tx4b: Recover funds after dispute

Escrow account account merged into Alice's

- seqNumber: N + 2
- content: account merge

#### Tx3b: Raise a dispute

The mediator cannot sign for anything but Tx4a or Tx4b

- seqNumber: N + 1
- content: signers options
- thresholds:
  - masterWeight: 0
  - lowThreshold: 3
  - medThreshold: 3
  - highThreshold: 3
- signers:
  - mediator (weight 2)
  - Tx4a (weight 1)
  - Tx4b (weight 1)

#### Tx2 Seal the escrow account

Alice or Charlie can proceed to payment or raise a dispute.

- seqNumber: N
- content: signers options
- thresholds:
  - masterWeight: 0
  - lowThreshold: 2
  - medThreshold: 2
  - highThreshold: 2
- signers:
  - escrow (weight 0)
  - Alice (weight 1)
  - Charlie (weight 1)
  - Tx3a (weight 1)
  - Tx3b (weight 1)

Now the Escrow account is locked and its private key cannot be used anymore.
