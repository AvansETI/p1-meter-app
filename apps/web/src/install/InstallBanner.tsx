import { IonButton, IonIcon } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import type { InstallMethod } from './platform';

/** Dismissible hint at the bottom of the Live page. */
export default function InstallBanner({
  method,
  onInstall,
  onDismiss,
}: {
  method: InstallMethod;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  return (
    <aside className="install-banner" aria-label={t('install.title')}>
      <img
        className="install-banner__icon"
        src="/brand/pwa-64x64.png"
        alt=""
        width="40"
        height="40"
      />
      <p className="install-banner__text">{t('install.bannerText')}</p>
      <IonButton size="small" onClick={onInstall}>
        {method === 'prompt' ? t('install.install') : t('install.how')}
      </IonButton>
      <IonButton
        size="small"
        fill="clear"
        color="medium"
        onClick={onDismiss}
        aria-label={t('install.dismiss')}
      >
        <IonIcon icon={closeOutline} slot="icon-only" aria-hidden="true" />
      </IonButton>
    </aside>
  );
}
