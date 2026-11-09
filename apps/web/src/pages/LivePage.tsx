import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../session/context';

export default function LivePage() {
  const { t } = useTranslation();
  const { state } = useSession();
  // Without export (no solar panels) nothing about export is shown.
  const hasExport = state.status === 'ready' && state.capabilities.hasExport;
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('live.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p className="app-placeholder">
          {hasExport ? t('live.placeholder') : t('live.placeholderNoExport')}
        </p>
      </IonContent>
    </IonPage>
  );
}
