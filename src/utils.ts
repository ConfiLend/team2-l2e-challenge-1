import { Bool, Field, PrivateKey, PublicKey } from "o1js"

export type TestAccount = {
  publicKey: PublicKey
  privateKey: PrivateKey
}

export const updateMessageForValidCheck1: (message: Field) => Field = (message: Field) => {
  let messageInBits: Bool[] = message.toBits()
  messageInBits[249] = Bool(true)
  messageInBits[250] = Bool(false)
  messageInBits[251] = Bool(false)
  messageInBits[252] = Bool(false)
  messageInBits[253] = Bool(false)
  messageInBits[254] = Bool(false)
  let messageInField: Field = Field.fromBits(messageInBits)
  return messageInField
}

export const updateMessageForInvalidCheck1: (message: Field) => Field = (message: Field) => {
  let messageInBits: Bool[] = message.toBits()
  messageInBits[249] = Bool(true)
  messageInBits[250] = Bool(true) // should be false for correct check
  messageInBits[251] = Bool(false)
  messageInBits[252] = Bool(false)
  messageInBits[253] = Bool(false)
  messageInBits[254] = Bool(false)
  let messageInField: Field = Field.fromBits(messageInBits)
  return messageInField
}

export const updateMessageForValidCheck2: (message: Field) => Field = (message: Field) => {
  let messageInBits: Bool[] = message.toBits()
  messageInBits[249] = Bool(false) // to not risk for true case by random
  messageInBits[250] = Bool(true)
  messageInBits[251] = Bool(true)
  messageInBits[252] = Bool(false) // to not risk for true case by random
  let messageInField: Field = Field.fromBits(messageInBits)
  return messageInField
}

export const updateMessageForInvalidCheck2: (message: Field) => Field = (message: Field) => {
  let messageInBits: Bool[] = message.toBits()
  messageInBits[249] = Bool(false) // to not risk for true case by random
  messageInBits[250] = Bool(true)
  messageInBits[251] = Bool(false) // should be true
  messageInBits[252] = Bool(false) // to not risk for true case by random
  let messageInField: Field = Field.fromBits(messageInBits)
  return messageInField
}

export const updateMessageForValidCheck3: (message: Field) => Field = (message: Field) => {
  let messageInBits: Bool[] = message.toBits()
  messageInBits[249] = Bool(false) // to not risk for true case by random
  messageInBits[252] = Bool(true)
  messageInBits[253] = Bool(false)
  messageInBits[254] = Bool(false)
  let messageInField: Field = Field.fromBits(messageInBits)
  return messageInField
}

export const updateMessageForInvalidCheck3: (message: Field) => Field = (message: Field) => {
  let messageInBits: Bool[] = message.toBits()
  messageInBits[249] = Bool(false) // to not risk for true case by random
  messageInBits[252] = Bool(true)
  messageInBits[253] = Bool(true) // should be false
  messageInBits[254] = Bool(false)
  let messageInField: Field = Field.fromBits(messageInBits)
  return messageInField
}