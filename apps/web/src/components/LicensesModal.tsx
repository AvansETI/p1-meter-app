import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

/** Generated at build time next to index.html (scripts/licenses.mjs). */
export const LICENSES_URL = '/third-party-licenses.txt';

/**
 * Loads the licenses as text. Anything other than plain text counts as an error: a dev
 * server or an SPA fallback answers an unknown path with index.html.
 */
async function fetchLicenses(): Promise<string> {
  const response = await fetch(LICENSES_URL);
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !type.startsWith('text/plain')) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

/**
 * Third-party licenses in a modal. Opening the text file as a page restarted the installed
 * app: the service worker answered the navigation with index.html, and an installed PWA on
 * iOS has no back button (#59).
 */
export default function LicensesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  // Fetched on first open and kept for the session; no automatic retries, the error says
  // to try again (closing and reopening the modal refetches).
  const licenses = useQuery({
    queryKey: ['third-party-licenses'],
    queryFn: fetchLicenses,
    enabled: isOpen,
    staleTime: Infinity,
    retry: false,
  });

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('settings.aboutThirdParty')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>{t('common.close')}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {licenses.isPending && <IonSpinner aria-label={t('common.loading')} />}
        {licenses.isError && <p role="alert">{t('settings.licensesError')}</p>}
        {licenses.isSuccess && <pre className="licenses">{licenses.data}</pre>}
      </IonContent>
    </IonModal>
  );
}
