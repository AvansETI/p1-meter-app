import { IonList, IonListHeader, IonNote } from '@ionic/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReleaseNotesModal from '../releases/ReleaseNotesModal';
import BrandLogo from './BrandLogo';
import LicensesModal from './LicensesModal';
import UsageStats from './UsageStats';

const PROJECT_URL = 'https://github.com/AvansETI/SmartMeter_DIY';
const LICENSE_URL = 'https://github.com/AvansETI/p1-meter-app/blob/main/LICENSE';

/** About the app: under Settings on mobile, its own page in the desktop side menu. */
export default function AboutSection({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [showLicenses, setShowLicenses] = useState(false);
  const [showReleases, setShowReleases] = useState(false);
  return (
    <IonList inset className={className}>
      <IonListHeader>{t('settings.about')}</IonListHeader>
      <div className="about">
        <BrandLogo className="about__logo" />
        <p className="about__lectorate">{t('settings.aboutLectorate')}</p>
        <div className="about__partners" aria-label={t('settings.aboutPartners')}>
          <img src="/brand/avans-logo.svg" alt="Avans Hogeschool" />
          <img src="/brand/hz-logo.svg" alt="HZ University of Applied Sciences" />
        </div>
        <p>{t('settings.aboutAuthor')}</p>
        <IonNote>{t('settings.version', { version: __APP_VERSION__ })}</IonNote>
        <button type="button" className="about__link" onClick={() => setShowReleases(true)}>
          {t('settings.releaseNotes')}
        </button>
        <UsageStats />
        <a href={PROJECT_URL} target="_blank" rel="noreferrer">
          {t('settings.aboutProject')}
        </a>
        <a href={LICENSE_URL} target="_blank" rel="noreferrer">
          {t('settings.aboutLicense')}
        </a>
        <button type="button" className="about__link" onClick={() => setShowLicenses(true)}>
          {t('settings.aboutThirdParty')}
        </button>
      </div>
      <LicensesModal isOpen={showLicenses} onClose={() => setShowLicenses(false)} />
      <ReleaseNotesModal isOpen={showReleases} onClose={() => setShowReleases(false)} />
    </IonList>
  );
}
