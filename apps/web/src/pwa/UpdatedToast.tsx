import { IonToast } from '@ionic/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UPDATED_FROM_KEY } from './autoUpdate';

/** True once after an automatic update reload; clears the marker. */
function takeUpdatedFlag(version: string): boolean {
  try {
    const from = sessionStorage.getItem(UPDATED_FROM_KEY);
    sessionStorage.removeItem(UPDATED_FROM_KEY);
    return from !== null && from !== version;
  } catch {
    return false;
  }
}

/** "Updated to version X" for 3 seconds after an automatic update (#64). */
export function UpdatedToast({ version = __APP_VERSION__ }: { version?: string }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(() => takeUpdatedFlag(version));
  return (
    <IonToast
      isOpen={show}
      message={t('pwa.updated', { version })}
      duration={3000}
      position="bottom"
      onDidDismiss={() => setShow(false)}
    />
  );
}
