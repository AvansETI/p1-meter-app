import { IonToast } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Registers the service worker and offers a reload when a new version is waiting. */
export default function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <IonToast
      isOpen={needRefresh}
      message={t('pwa.updateAvailable')}
      position="bottom"
      buttons={[
        {
          text: t('pwa.reload'),
          handler: () => {
            void updateServiceWorker(true);
          },
        },
      ]}
      onDidDismiss={() => setNeedRefresh(false)}
    />
  );
}
