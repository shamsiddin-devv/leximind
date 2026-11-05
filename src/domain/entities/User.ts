import { BadRequestError } from "../errors/BadRequestError";
import { Email } from "../value-objects/Email";

export interface IUserProps {
  id?: string,
  fullName: string,
  email: Email,
  createdAt?: Date
};

export class User {
  constructor(private readonly props: IUserProps) {
    if(!props.fullName && props.fullName.trim() === '') {
      throw new BadRequestError('Full name is required.');
    };
  };

  update(props: Partial<{
    fullName: string,
    email: string,
  }>): void {
    if(props.fullName !== undefined) {
      if(!props.fullName) throw new BadRequestError('Full name must not be empty.');
      this.props.fullName = props.fullName
    };
    if(props.email !== undefined) {
      const checkingEmail = new Email(props.email);
      this.props.email = checkingEmail;
    };
  }

  get id() {return this.props.id};
  get fullName() {return this.props.fullName};
  get email() {return this.props.email};
  get createdAt() {return this.props.createdAt};
};