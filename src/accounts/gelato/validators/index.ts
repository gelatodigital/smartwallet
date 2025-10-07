import type { Account, Address } from "viem";

export {
  addSession,
  removeSession
} from "./session.js";

import { VALIDATOR_ADDRESS } from "./session.js";

export enum ValidatorType {
  // TODO: add support for passkey
  Session = "session"
}

export interface BaseValidator {
  address: string;
  type: ValidatorType;
  account: Address;
}

export interface SessionValidator extends BaseValidator {
  type: ValidatorType.Session;
  signer: Account;
}

export interface SessionValidatorRpc {
  type: ValidatorType.Session;
  signer: Address;
}

export type Validator = SessionValidator;
export type ValidatorRpc = SessionValidatorRpc;

export const session = (account: Address, signer: Account): SessionValidator => ({
  account,
  address: VALIDATOR_ADDRESS,
  signer,
  type: ValidatorType.Session
});

export const toValidatorRpc = (validator: Validator): ValidatorRpc => ({
  signer: validator.signer.address,
  type: validator.type
});
