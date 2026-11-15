import { BadRequestError } from '../errors/BadRequestError';
import { Email } from '../value-objects/Email';

export interface IUserProps {
  id?: string;
  fullName: string;
  email: Email;
  createdAt?: Date;
  emailVerifiedAt?: Date | null;
}

export class User {
  constructor(private readonly props: IUserProps) {
    if (
      typeof props.fullName !== 'string' ||
      !props.fullName.trim() ||
      props.fullName.trim().length > 255
    ) {
      throw new BadRequestError('Full name is required.');
    }
  }

  update(
    props: Partial<{
      fullName: string;
      email: string;
    }>,
  ): void {
    if (props.fullName !== undefined) {
      if (!props.fullName.trim() || props.fullName.trim().length > 255)
        throw new BadRequestError('Full name must not be empty.');
      this.props.fullName = props.fullName;
    }
    if (props.email !== undefined) {
      const checkingEmail = new Email(props.email);
      this.props.email = checkingEmail;
    }
  }

  get id() {
    return this.props.id;
  }
  get fullName() {
    return this.props.fullName;
  }
  get email() {
    return this.props.email;
  }
  get emailVerifiedAt() {
    return this.props.emailVerifiedAt ?? null;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
