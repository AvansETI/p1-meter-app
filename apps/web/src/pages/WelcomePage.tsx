import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../components/BrandLogo';
import EmonIdForm from '../components/EmonIdForm';

/** Shown while no EMON ID is stored (visual design §7.1). */
export default function WelcomePage() {
  const { t } = useTranslation();
  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="welcome">
          <BrandLogo className="welcome__logo" />
          <h1 className="welcome__title">{t('app.name')}</h1>
          <p className="welcome__intro">{t('welcome.intro')}</p>
          <EmonIdForm />
        </div>
      </IonContent>
    </IonPage>
  );
}
