import { BadRequestError } from '../errors/BadRequestError';
import type { Avatar } from '../services/IAvatarStorage';
import { Email } from '../value-objects/Email';
import { normalizeBioFormat } from '../value-objects/BioFormatting';
import {
  type SocialLinks,
  type SocialLinksPatch,
  updateSocialLinks,
} from '../value-objects/ProfileSocialLinks';

const countryNames = new Intl.DisplayNames(['uz', 'en'], { type: 'region' });

export const genders = ['female', 'male', 'other', 'undisclosed'] as const;
export type Gender = (typeof genders)[number];
export const uzbekPhoneNumberPattern = /^[+]998[0-9]{9}$/;
export const phoneNumberPattern = /^[+][1-9][0-9]{7,14}$/;

export type ProfilePrivacy = {
  profilePublic: boolean;
  profileSharing: boolean;
  publicStatistics: boolean;
  publicCefr: boolean;
  publicBio: boolean;
  publicSocialLinks: boolean;
};

export type UserDetails = Partial<ProfilePrivacy> & {
  bio?: string | null;
  bioFormat?: string | null;
  location?: string | null;
  countryCode?: string | null;
  city?: string | null;
  administrativeRegion?: string | null;
  streetAddress?: string | null;
  addressDetails?: string | null;
  gender?: Gender | null;
  phoneNumber?: string | null;
  socialLinks?: SocialLinksPatch;
};

export interface IUserProps extends Omit<UserDetails, 'socialLinks'> {
  id?: string;
  fullName: string;
  email: Email;
  createdAt?: Date;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  avatar?: Avatar | null;
  socialLinks?: SocialLinks;
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

  update(props: UserDetails & { fullName?: string; email?: string }): void {
    const links = props.socialLinks
      ? updateSocialLinks(this.socialLinks, props.socialLinks)
      : undefined;
    if (props.fullName !== undefined) {
      if (!props.fullName.trim() || props.fullName.trim().length > 255)
        throw new BadRequestError('Full name must not be empty.');
      this.props.fullName = props.fullName;
    }
    if (props.email !== undefined) {
      const checkingEmail = new Email(props.email);
      if (checkingEmail.toString() !== this.props.email.toString())
        this.props.emailVerifiedAt = null;
      this.props.email = checkingEmail;
    }
    if (props.bio !== undefined) {
      const bio = props.bio?.trim() || null;
      if (bio !== this.bio) this.props.bioFormat = null;
      this.props.bio = bio;
    }
    if (props.bioFormat !== undefined) {
      this.props.bioFormat =
        props.bioFormat === null
          ? null
          : normalizeBioFormat(props.bioFormat, this.bio);
    }
    if (props.countryCode !== undefined || props.city !== undefined) {
      this.updatePlace(props.countryCode, props.city);
    } else if (
      props.location !== undefined &&
      (props.location?.trim() || null) !== this.location
    ) {
      this.props.location = props.location?.trim() || null;
      this.props.countryCode = null;
      this.props.city = null;
      this.clearPrivateAddress();
    }
    if (props.administrativeRegion !== undefined) {
      const region = props.administrativeRegion?.trim() || null;
      if (this.administrativeRegion !== region) this.clearPrivateAddress();
      this.props.administrativeRegion = region;
    }
    if (props.streetAddress !== undefined) {
      const street = props.streetAddress?.trim() || null;
      if (this.streetAddress !== street) this.props.addressDetails = null;
      this.props.streetAddress = street;
    }
    if (props.addressDetails !== undefined)
      this.props.addressDetails = props.addressDetails?.trim() || null;
    if (props.gender !== undefined) this.props.gender = props.gender;
    if (
      props.phoneNumber !== undefined &&
      props.phoneNumber !== this.phoneNumber
    ) {
      this.props.phoneNumber = props.phoneNumber;
      this.props.phoneVerifiedAt = null;
    }
    if (links) this.props.socialLinks = links;
    if (props.profilePublic !== undefined)
      this.props.profilePublic = props.profilePublic;
    if (props.profileSharing !== undefined)
      this.props.profileSharing = props.profileSharing;
    if (props.publicStatistics !== undefined)
      this.props.publicStatistics = props.publicStatistics;
    if (props.publicCefr !== undefined)
      this.props.publicCefr = props.publicCefr;
    if (props.publicBio !== undefined) this.props.publicBio = props.publicBio;
    if (props.publicSocialLinks !== undefined)
      this.props.publicSocialLinks = props.publicSocialLinks;
  }

  private updatePlace(
    countryCode: string | null | undefined,
    city: string | null | undefined,
  ) {
    const country = countryCode === undefined ? this.countryCode : countryCode;
    const nextCity =
      city === undefined
        ? country === this.countryCode
          ? this.city
          : null
        : city?.trim() || null;
    if (country !== null && !/^[A-Z]{2}$/.test(country))
      throw new BadRequestError('Invalid country code.');
    if (nextCity && !country)
      throw new BadRequestError('A city requires a country.');
    if (country !== this.countryCode || nextCity !== this.city)
      this.clearPrivateAddress();
    this.props.countryCode = country;
    this.props.city = nextCity;
    if (!country) {
      this.props.location = null;
      return;
    }
    const label = countryNames.of(country) ?? country;
    const place = nextCity ? nextCity + ', ' + label : label;
    this.props.location = Array.from(place).length <= 100 ? place : label;
  }

  private clearPrivateAddress() {
    this.props.administrativeRegion = null;
    this.props.streetAddress = null;
    this.props.addressDetails = null;
  }

  get administrativeRegion() {
    return this.props.administrativeRegion ?? null;
  }
  get streetAddress() {
    return this.props.streetAddress ?? null;
  }
  get addressDetails() {
    return this.props.addressDetails ?? null;
  }
  get phoneVerifiedAt() {
    return this.props.phoneVerifiedAt ?? null;
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
  setAvatar(avatar: Avatar | null) {
    this.props.avatar = avatar;
  }
  get avatar() {
    return this.props.avatar ?? null;
  }
  get emailVerifiedAt() {
    return this.props.emailVerifiedAt ?? null;
  }
  get bio() {
    return this.props.bio ?? null;
  }
  get bioFormat() {
    return this.props.bioFormat ?? null;
  }
  get countryCode() {
    return this.props.countryCode ?? null;
  }
  get city() {
    return this.props.city ?? null;
  }
  get location() {
    return this.props.location ?? null;
  }
  get gender() {
    return this.props.gender ?? null;
  }
  get phoneNumber() {
    return this.props.phoneNumber ?? null;
  }
  get socialLinks(): SocialLinks {
    return this.props.socialLinks ?? {};
  }
  get privacy(): ProfilePrivacy {
    return {
      profilePublic: this.props.profilePublic ?? false,
      profileSharing: this.props.profileSharing ?? false,
      publicStatistics: this.props.publicStatistics ?? false,
      publicCefr: this.props.publicCefr ?? false,
      publicBio: this.props.publicBio ?? false,
      publicSocialLinks: this.props.publicSocialLinks ?? false,
    };
  }
  get hasProfileBadge() {
    return Boolean(
      this.emailVerifiedAt &&
      this.countryCode &&
      this.city &&
      (this.countryCode !== 'UZ' || this.administrativeRegion) &&
      this.gender &&
      this.gender !== 'undisclosed' &&
      this.phoneVerifiedAt,
    );
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
