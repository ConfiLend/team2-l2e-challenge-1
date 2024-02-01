import { SecretMessageContract } from './SecretMessageContract.js';
import {
  Mina,
  PrivateKey,
  AccountUpdate,
  PublicKey,
  Field,
  UInt32,
} from 'o1js';
import { TestAccount, updateMessageForInvalidCheck1, updateMessageForInvalidCheck2, updateMessageForInvalidCheck3, updateMessageForValidCheck1, updateMessageForValidCheck2, updateMessageForValidCheck3 } from './utils.js';

const AVAILABLE_TEST_ACCOUNTS_IN_LOCAL = 10
const RANDOM_ADDED_TEST_ACCOUNTS = 97

describe('Secret Message service', () => {
  let
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkAppInstance: SecretMessageContract,
    localTestAccounts: TestAccount[] = []
  
  beforeAll(async () => {
    const useProof = false;

    const Local = Mina.LocalBlockchain({ proofsEnabled: useProof });
    Mina.setActiveInstance(Local);
    const { privateKey: deployerKey, publicKey: deployerAccount } = Local.testAccounts[0];

    // ----------------------------------------------------

    // Create a public/private key pair. The public key is your address and where you deploy the zkApp to
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();

    // create an instance of SecretMessageContract - and deploy it to zkAppAddress
    zkAppInstance = new SecretMessageContract(zkAppAddress);
    const deployTxn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkAppInstance.deploy();
    });
    
    await deployTxn.prove()

    await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

    // prepare test accounts
    for (let idx = 1; idx <= AVAILABLE_TEST_ACCOUNTS_IN_LOCAL; idx++) {
      const currentTestAccount: TestAccount = Local.testAccounts[idx];
      localTestAccounts.push(currentTestAccount)
    }

  })

  test('a new user is introduced by an account that is admin', async () => {
    const initialValue = zkAppInstance.totalNumberOfUsers.get();
    const { privateKey: senderKey, publicKey: senderAccount } = localTestAccounts[0];
    const { publicKey: testAccount1 } = localTestAccounts[1];
    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      zkAppInstance.addNewUser(testAccount1);
      zkAppInstance.requireSignature()
    });

    await txn.prove();
    await txn.sign([senderKey, zkAppPrivateKey]).send();

    const updatedNum = zkAppInstance.totalNumberOfUsers.get();
    expect(updatedNum).toEqual(initialValue.add(1));
  })

  test('a new user is introduced by an account that is not admin', async () => {
    const { publicKey: senderAccount } = localTestAccounts[0];
    const { privateKey: testKey5, publicKey: testAccount5 } = localTestAccounts[5];
    // update transaction
    const txn5 = await Mina.transaction(senderAccount, () => {
      zkAppInstance.addNewUser(testAccount5);
      zkAppInstance.requireSignature()
    });
    await txn5.prove();

    const sendId = txn5.sign([testKey5]).send()
    await expect(sendId).rejects.toThrow();
  })

  test('an already existing user is introduced by an account that is admin', async () => {
    const { publicKey: senderAccount } = localTestAccounts[0];
    const { publicKey: testAccount1 } = localTestAccounts[1];
    // update transaction
    const txn = Mina.transaction(senderAccount, () => {
      zkAppInstance.addNewUser(testAccount1);
      zkAppInstance.requireSignature()
    });
    await expect(txn).rejects.toThrowError('user already exists in eligible addresses');
  })

  test('a second new user is introduced by an account that is admin', async () => {
    const initialValue = zkAppInstance.totalNumberOfUsers.get();
    const { privateKey: senderKey, publicKey: senderAccount } = localTestAccounts[0];
    const { publicKey: testAccount2 } = localTestAccounts[2];
    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      zkAppInstance.addNewUser(testAccount2);
      zkAppInstance.requireSignature()
    });

    await txn.prove();
    await txn.sign([senderKey, zkAppPrivateKey]).send();

    const updatedNum = zkAppInstance.totalNumberOfUsers.get();
    expect(updatedNum).toEqual(initialValue.add(1));
  })

  test('total number of users should be 2', async () => {
    const numberOfUsers = zkAppInstance.totalNumberOfUsers.get();
    expect(numberOfUsers).toEqual(Field(2));
  })

  test('a valid message for check1 is sent by eligible address', async () => {
    const initialValue = zkAppInstance.totalNumberOfMessages.get();
    const { privateKey: testKey1, publicKey: testAccount1 } = localTestAccounts[1];
    // update transaction
    let message: Field = Field.random()
    const txn = await Mina.transaction(testAccount1, () => {
      message = updateMessageForValidCheck1(message)
      zkAppInstance.sendMessage(message);
    });

    await txn.prove();
    await txn.sign([testKey1]).send();

    let messageRetrieved: Field = Field.empty()
    const txnToGetMessage = await Mina.transaction(testAccount1, () => {
      messageRetrieved = zkAppInstance.getUserMessage(testAccount1);
    });

    await txnToGetMessage.prove();
    await txnToGetMessage.sign([testKey1]).send();

    const updatedNum = zkAppInstance.totalNumberOfMessages.get();
    expect(updatedNum).toEqual(initialValue.add(1));
    expect(message).toEqual(messageRetrieved)
  })

  test('a message is sent by not eligible address', async () => {
    const { publicKey: testAccount3 } = localTestAccounts[3];
    // update transaction
    let message: Field = Field.empty()
    const txn = Mina.transaction(testAccount3, () => {
      message = Field.random()
      zkAppInstance.sendMessage(message);
    });
    await expect(txn).rejects.toThrowError('user does not exist in eligible addresses');    
  })

  test('an invalid message for check1 is sent by an eligible address', async () => {
    const { publicKey: testAccount2 } = localTestAccounts[2];
    // update transaction
    let message: Field = Field.random()
    const txn = Mina.transaction(testAccount2, () => {
      message = updateMessageForInvalidCheck1(message)      
      zkAppInstance.sendMessage(message);
    });
    await expect(txn).rejects.toThrowError('message structure is invalid');    
  })

  test('an invalid message for check2 is sent by an eligible address', async () => {
    const { publicKey: testAccount2 } = localTestAccounts[2];
    // update transaction
    let message: Field = Field.random()
    const txn = Mina.transaction(testAccount2, () => {
      message = updateMessageForInvalidCheck2(message)      
      zkAppInstance.sendMessage(message);
    });
    await expect(txn).rejects.toThrowError('message structure is invalid');    
  })

  test('an invalid message for check3 is sent by an eligible address', async () => {
    const { publicKey: testAccount2 } = localTestAccounts[2];
    // update transaction
    let message: Field = Field.random()
    const txn = Mina.transaction(testAccount2, () => {
      message = updateMessageForInvalidCheck3(message)      
      zkAppInstance.sendMessage(message);
    });
    await expect(txn).rejects.toThrowError('message structure is invalid');    
  })

  test('an eligible address should not be able to send more than one message', async () => {
    const { publicKey: testAccount1 } = localTestAccounts[1];
    // update transaction
    let message: Field = Field.random()
    const txn = Mina.transaction(testAccount1, () => {
      message = updateMessageForValidCheck1(message)
      zkAppInstance.sendMessage(message);
    });
    await expect(txn).rejects.toThrowError('user already deposited a message');
  })

  test('a valid message for check2 is sent and event is emitted', async () => {
    const initialValue = zkAppInstance.totalNumberOfMessages.get();
    const { privateKey: testKey2, publicKey: testAccount2 } = localTestAccounts[2];
    // update transaction
    let message: Field = Field.random()
    message = updateMessageForValidCheck2(message)
    const txn = await Mina.transaction(testAccount2, () => {
      zkAppInstance.sendMessage(message);
    });

    await txn.prove();
    await txn.sign([testKey2]).send();

    let messageRetrieved: Field = Field.empty()
    const txnToGetMessage = await Mina.transaction(testAccount2, () => {
      messageRetrieved = zkAppInstance.getUserMessage(testAccount2);
    });

    await txnToGetMessage.prove();
    await txnToGetMessage.sign([testKey2]).send();

    const updatedNum = zkAppInstance.totalNumberOfMessages.get();
    expect(updatedNum).toEqual(initialValue.add(1));
    expect(message).toEqual(messageRetrieved)
  
    const events = await zkAppInstance.fetchEvents(UInt32.from(0))
    expect(events[1].type).toMatch("NewMessageReceived")
    expect(events[1].event.data).toEqual(message)
    
  })

  test('a valid message for check3 is sent by eligible address', async () => {
    // add new user for check3 message
    const { privateKey: senderKey, publicKey: senderAccount } = localTestAccounts[0];
    const { privateKey: testKey3, publicKey: testAccount3 } = localTestAccounts[3];
    // update transaction
    const txnAddUser = await Mina.transaction(senderAccount, () => {
      zkAppInstance.addNewUser(testAccount3);
      zkAppInstance.requireSignature()
    });

    await txnAddUser.prove();
    await txnAddUser.sign([senderKey, zkAppPrivateKey]).send();
  
    const initialValue = zkAppInstance.totalNumberOfMessages.get();

    // update transaction
    let message: Field = Field.random()
    const txn = await Mina.transaction(testAccount3, () => {
      message = updateMessageForValidCheck3(message)
      zkAppInstance.sendMessage(message);
    });

    await txn.prove();
    await txn.sign([testKey3]).send();

    let messageRetrieved: Field = Field.empty()
    const txnToGetMessage = await Mina.transaction(testAccount3, () => {
      messageRetrieved = zkAppInstance.getUserMessage(testAccount3);
    });

    await txnToGetMessage.prove();
    await txnToGetMessage.sign([testKey3]).send();

    const updatedNum = zkAppInstance.totalNumberOfMessages.get();
    expect(updatedNum).toEqual(initialValue.add(1));
    expect(message).toEqual(messageRetrieved)
  })

  test('hundred users are introduced by an account that is admin', async () => {
    // there is already 3 users introduced. will be extended to 100.
    const initialValue = zkAppInstance.totalNumberOfUsers.get();
    expect(initialValue).toEqual(Field(3));

    const { privateKey: senderKey, publicKey: senderAccount } = localTestAccounts[0];

    let currentTxn: Mina.Transaction

    for (let idx = 1; idx <= RANDOM_ADDED_TEST_ACCOUNTS; idx++) {
      // if (idx % 10) {
      //   console.log("100 account test progress: [", idx, "/", RANDOM_ADDED_TEST_ACCOUNTS, "]")
      // }
      // update transaction
      currentTxn = await Mina.transaction(senderAccount, () => {
        const randomPrivateKey = PrivateKey.random()
        const publicKeyToPrivate = randomPrivateKey.toPublicKey()
        zkAppInstance.addNewUser(publicKeyToPrivate);
        zkAppInstance.requireSignature()
      });
      await currentTxn.prove();
      await currentTxn.sign([senderKey, zkAppPrivateKey]).send();
    }

    const updatedNum = zkAppInstance.totalNumberOfUsers.get();
    expect(updatedNum).toEqual(Field(100));
  })

  test('total number of users should be 100', async () => {
    const numberOfUsers = zkAppInstance.totalNumberOfUsers.get();
    expect(numberOfUsers).toEqual(Field(100));
  })

});