import { BadRequestError } from "../errors/BadRequestError";
import { ValidateError } from "../errors/ValidateError";


export class Email {
  private value: string;

  constructor(email: string) {
    if(!email) throw new BadRequestError('Email is required.');
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if(!valid) throw new ValidateError('Invalid email addres.');
    this.value = email.toString().trim();
  };

  toString() {
    return this.value;
  };

  equals(other: Email) {
    return this.value === other.value
  };
}