import { 
  Field, 
  SmartContract, 
  state, 
  State, 
  method,
  provable,
  Provable,
  PublicKey,
  Permissions,
  Struct,
  Reducer,
  Bool
} from 'o1js';

class SecretMessage extends Struct({
  user: PublicKey,
  message: Field
}) {}

const KeyValuePair = provable({
  key: PublicKey,
  value: Field,
});

export class SecretMessageContract extends SmartContract {
  @state(Field) totalNumberOfUsers = State<Field>();
  @state(Field) totalNumberOfMessages = State<Field>();
  
  reducer = Reducer({
    actionType: KeyValuePair
  })

  events = {
    "new-message-received": Field
  }

  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editActionState: Permissions.proofOrSignature()
    })
    this.totalNumberOfUsers.set(Field(0));
    this.totalNumberOfMessages.set(Field(0));
  }

  @method addNewUser(user: PublicKey) {
    this.requireSignature()
    const MAXIMUM_NUMBER_OF_ELIGIBLE_ADDRESS = Field(100)

    let pendingActions = this.reducer.getActions({
      fromActionState: Reducer.initialActionState,
    })

    let initial = {
      state: new SecretMessage({
        user: PublicKey.empty(),
        message: Field.empty()
      }),
      actionState: Reducer.initialActionState
    }

    let { state: matchUser } = this.reducer.reduce(pendingActions, SecretMessage, (state, action) => {
      let isMatch = user.equals(action.key)
      return {
        user: Provable.if(isMatch, action.key, state.user),
        message: Provable.if(isMatch, action.value, state.message)
      }
    }, initial, {
      maxTransactionsWithActions: 150
    })

    matchUser.user.equals(PublicKey.empty()).assertTrue("user already exists in eligible addresses")

    const currentState = this.totalNumberOfUsers.get();
    this.totalNumberOfUsers.requireEquals(currentState);
    currentState.assertLessThan(MAXIMUM_NUMBER_OF_ELIGIBLE_ADDRESS, "maximum number of users reached")
    this.totalNumberOfUsers.set(currentState.add(1));
    this.reducer.dispatch({key: user, value: Field.empty()})
  }

  @method sendMessage(message: Field) {
    const currentState = this.totalNumberOfMessages.get();
    this.totalNumberOfMessages.requireEquals(currentState);

    let pendingActions = this.reducer.getActions({
      fromActionState: Reducer.initialActionState,
    })

    let initial = {
      state: new SecretMessage({
        user: PublicKey.empty(),
        message: Field.empty()
      }),
      actionState: Reducer.initialActionState
    }

    const user = this.sender

    let { state: matchUser } = this.reducer.reduce(pendingActions, SecretMessage, (state, action) => {
      let isMatch = user.equals(action.key)
      return {
        user: Provable.if(isMatch, action.key, state.user),
        message: Provable.if(isMatch, action.value, state.message)
      }
    }, initial, {
      maxTransactionsWithActions: 150
    })

    matchUser.user.equals(PublicKey.empty()).assertFalse("user does not exist in eligible addresses")

    matchUser.message.assertEquals(Field.empty(), "user already deposited a message")

    const messageInBits = message.toBits(255)
    const check1: Bool = Provable.if(messageInBits[249],
      messageInBits[250].not()
      .and(messageInBits[251].not())
      .and(messageInBits[252].not())
      .and(messageInBits[253].not())
      .and(messageInBits[254].not()),
      Bool(true)
      )

    const check2: Bool = Provable.if(messageInBits[250],
      messageInBits[251],
      Bool(true)
      )
    
    const check3: Bool = Provable.if(messageInBits[252],
      messageInBits[253].not()
      .and(messageInBits[254].not()),
      Bool(true)
      )

    const isMessageValid: Bool = check1.and(check2).and(check3)

    isMessageValid.assertTrue("message structure is invalid")

    this.totalNumberOfMessages.set(currentState.add(1));
    this.reducer.dispatch({key: user, value: message})
    this.emitEvent("new-message-received", message);
  }

  @method getUserMessage(user: PublicKey): Field {
    let pendingActions = this.reducer.getActions({
      fromActionState: Reducer.initialActionState,
    })

    let initial = {
      state: new SecretMessage({
        user: PublicKey.empty(),
        message: Field.empty()
      }),
      actionState: Reducer.initialActionState
    }

    let { state: matchUser } = this.reducer.reduce(pendingActions, SecretMessage, (state, action) => {
      let isMatch = user.equals(action.key)
      return {
        user: Provable.if(isMatch, action.key, state.user),
        message: Provable.if(isMatch, action.value, state.message)
      }
    }, initial, {
      maxTransactionsWithActions: 150
    })

    matchUser.user.equals(PublicKey.empty()).assertFalse("user does not exist in eligible addresses")

    return matchUser.message
  }
}