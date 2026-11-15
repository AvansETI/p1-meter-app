import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import AboutSection from '../components/AboutSection';
import ToolbarLogo from '../components/ToolbarLogo';
import FestiveDecoration from '../festive/FestiveDecoration';

/** About as its own page: an item of the desktop side menu (docs/design/2026-11-15-release-notes.md). */
export default function AboutPage() {
  const { t } = useTranslation();
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('nav.about')}</IonTitle>
          <ToolbarLogo />
        </IonToolbar>
        <FestiveDecoration />
      </IonHeader>
      <IonContent>
        <AboutSection />
      </IonContent>
    </IonPage>
  );
}
