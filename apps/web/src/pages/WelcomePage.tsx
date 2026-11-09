import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/react';
import { downloadOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../components/BrandLogo';
import EmonIdForm from '../components/EmonIdForm';
import InstallSheet from '../install/InstallSheet';
import { OFFERABLE, useInstall } from '../install/useInstall';

/** Shown while no EMON ID is stored (visual design §7.1). */
export default function WelcomePage() {
  const { t } = useTranslation();
  const install = useInstall();
  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="welcome">
          <BrandLogo className="welcome__logo" />
          <h1 className="welcome__title">{t('app.name')}</h1>
          <p className="welcome__intro">{t('welcome.intro')}</p>
          <EmonIdForm />
          {OFFERABLE.has(install.method) && (
            <IonButton
              fill="clear"
              size="small"
              className="welcome__install"
              onClick={install.start}
            >
              <IonIcon icon={downloadOutline} slot="start" aria-hidden="true" />
              {t('install.installAsApp')}
            </IonButton>
          )}
          <InstallSheet
            method={install.method}
            isOpen={install.sheetOpen}
            onClose={install.closeSheet}
          />
        </div>
      </IonContent>
    </IonPage>
  );
}
