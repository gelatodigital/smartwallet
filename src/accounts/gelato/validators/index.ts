import type { Account, Address } from "viem";

export {
  addSession,
  removeSession
} from "./session.js";

export enum ValidatorType {
  // TODO: add support for passkey
  Session = "session"
}

export interface BaseValidator {
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
  type: ValidatorType.Session,
  account,
  signer
});

export const toValidatorRpc = (validator: Validator): ValidatorRpc => ({
  type: validator.type,
  signer: validator.signer.address
});
