import { profileBannerSource, type ProfileAppearance } from '../data/profileAppearance';
import './ProfileBannerPreviews.css';

export function ProfileBannerPreviews({ image, position }: {
  image: string;
  position: ProfileAppearance['position'];
}) {
  return <span className="profile-banner-previews">
    <span className="profile-banner-preview" data-crop="horizontal">
      <img src={profileBannerSource(image, 'horizontal', true)} alt="" loading="lazy" decoding="async" style={{ objectPosition: position }} />
      <span>Gorizontal</span>
    </span>
    <span className="profile-banner-preview" data-crop="vertical">
      <img src={profileBannerSource(image, 'vertical', true)} alt="" loading="lazy" decoding="async" style={{ objectPosition: position }} />
      <span>Vertikal</span>
    </span>
  </span>;
}
