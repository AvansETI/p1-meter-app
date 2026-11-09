import { IonContent, IonHeader, IonNote, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('settings.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p className="app-placeholder">{t('settings.placeholder')}</p>
        <IonNote>{t('settings.version', { version: __APP_VERSION__ })}</IonNote>
      </IonContent>
    </IonPage>
  );
}
