Feature: Transaction smart contract

  Scenario: Running an ideal transaction
    Given Charlie and Alice have a balance
    When Charlie creates the contract
    And Alice funds the escrow account with 100 XLM
    And I wait for 20 seconds
    And Alice signs and submits the "proceed" transaction
    And I wait for 5 seconds
    Then Charlie should have received a payment of 100 XLM

  Scenario: Charlie tries to withdraw the amount before the lockup period
    Given Charlie and Alice have a balance
    When Charlie creates the contract
    And Alice funds the escrow account with 100 XLM
    And Charlie signs and submits the "proceed" transaction
    And I wait for 5 seconds
    Then The payment should be rejected with a "tx_too_early" message
    And Charlie should not have received any payment

  Scenario: Charlie tries to withdraw the amount with the escrow private key
    Given Charlie and Alice have a balance
    When Charlie creates the contract
    And Alice funds the escrow account with 100 XLM
    And Charlie signs and submits a "withdrawal" transaction with the escrow key
    Then The payment should be rejected with a "tx_bad_auth" message
    And Charlie should not have received any payment

  Scenario: Charlie tries to withdraw the amount after a dispute has been raised
    Given Charlie and Alice have a balance
    When Charlie creates the contract
    And Alice funds the escrow account with 100 XLM
    And Alice raises a dispute
    And I wait for 20 seconds
    And Charlie signs and submits the "proceed" transaction
    And I wait for 5 seconds
    Then The payment should be rejected with a "tx_bad_seq" message
    And Charlie should not have received any payment

  Scenario: Alice tries to withdraw the amount from the escrow with her private key
    Given Charlie and Alice have a balance
    When Charlie creates the contract
    And Alice funds the escrow account with 100 XLM
    And Alice signs and submits a "withdrawal" transaction
    And I wait for 5 seconds
    Then The payment should be rejected with a "tx_bad_auth" message


  Scenario: Alice raises a dispute but Maria proceeds to the transaction
    Given Charlie and Alice have a balance
    When Charlie creates the contract
    And Alice funds the escrow account with 100 XLM
    And I wait for 5 seconds
    And Alice raises a dispute
    And Maria signs and submits the "proceed after dispute" transaction
    And I wait for 5 seconds
    Then Charlie should have received a payment of 100 XLM


  Scenario: Alice raises a dispute and Maria triggers the funds recovery
    Given Charlie and Alice have a balance
    When Charlie creates the contract
    And Alice funds the escrow account with 100 XLM
    And I wait for 5 seconds
    And Alice raises a dispute
    And Maria signs and submits the "recover after dispute" transaction
    And I wait for 5 seconds
    Then Alice's balance should be restored
