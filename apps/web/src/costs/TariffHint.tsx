import { IonToast, useIonRouter } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../settings/context';
import { claimTariffHint } from './hintState';

/**
 * Short hint on Live when no tariffs are set (costs design §7.1); mount it once that is known: "Instellen" opens the tariff
 * settings; closing it offers to never show it again.
 */
export default function TariffHint() {
  const { t } = useTranslation();
  const router = useIonRouter();
  const { settings, turnOffTariffHint } = useSettings();
  const [visible] = useState(() => {
    // At most once per app start, also when the user switches tabs.
    return !settings.tariffHintOff && claimTariffHint();
  });
  const [hint, setHint] = useState(visible);
  const [asking, setAsking] = useState(false);

  return (
    <>
      <IonToast
        isOpen={hint}
        message={t('costs.hint')}
        duration={5000}
        position="top"
        buttons={[
          { text: t('costs.hintAction'), handler: () => router.push('/settings/tariffs') },
          {
            icon: closeOutline,
            role: 'cancel',
            side: 'end',
            htmlAttributes: { 'aria-label': t('common.close') },
            handler: () => setAsking(true),
          },
        ]}
        onDidDismiss={() => setHint(false)}
      />
      <IonToast
        isOpen={asking}
        message={t('costs.hintNever')}
        duration={4000}
        position="top"
        buttons={[{ text: t('costs.hintNeverAction'), handler: turnOffTariffHint }]}
        onDidDismiss={() => setAsking(false)}
      />
    </>
  );
}
