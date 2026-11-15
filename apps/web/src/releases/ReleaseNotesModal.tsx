import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { dateFormat } from '../i18n/dates';
import { RELEASES } from './releases';

const longDate = () => dateFormat({ day: 'numeric', month: 'long', year: 'numeric' });

/**
 * All versions, newest first, in the app's language (docs/design/2026-11-15-release-notes.md).
 * A modal, like the licenses, so an installed app does not restart (#59).
 */
export default function ReleaseNotesModal({
  isOpen,
  onClose,
  current = __APP_VERSION__,
}: {
  isOpen: boolean;
  onClose: () => void;
  current?: string;
}) {
  const { t, i18n } = useTranslation();
  const english = i18n.language.startsWith('en');
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('settings.releaseNotes')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>{t('common.close')}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <ol className="release-notes">
          {RELEASES.map((release) => (
            <li key={release.version} className="release-notes__item">
              <h3>
                {release.version}
                {release.version === current && (
                  <span className="release-notes__current">{t('settings.thisVersion')}</span>
                )}
              </h3>
              <time dateTime={release.date}>
                {longDate().format(new Date(`${release.date}T12:00:00`))}
              </time>
              <p>{english ? release.en : release.nl}</p>
            </li>
          ))}
        </ol>
      </IonContent>
    </IonModal>
  );
}
