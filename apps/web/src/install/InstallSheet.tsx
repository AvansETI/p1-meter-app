import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { addCircleOutline, ellipsisVertical, shareOutline } from 'ionicons/icons';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import type { InstallMethod } from './platform';

const STEPS = {
  ios: [
    { key: 'install.steps.ios.1', icon: shareOutline },
    { key: 'install.steps.ios.2', icon: addCircleOutline },
    { key: 'install.steps.ios.3' },
  ],
  'macos-safari': [{ key: 'install.steps.macos.1' }, { key: 'install.steps.macos.2' }],
  'firefox-android': [
    { key: 'install.steps.firefox.1', icon: ellipsisVertical },
    { key: 'install.steps.firefox.2' },
  ],
} as const;

type Step = (typeof STEPS)[keyof typeof STEPS][number];
const stepsFor = (method: InstallMethod): readonly Step[] =>
  method in STEPS ? STEPS[method as keyof typeof STEPS] : [];

/** Numbered steps for browsers without a native install dialog (design §5). */
export default function InstallSheet({
  method,
  isOpen,
  onClose,
}: {
  method: InstallMethod;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const steps = stepsFor(method);
  const bold = { strong: <strong /> } satisfies Record<string, ReactNode>;

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={0.6}
      breakpoints={[0, 0.6, 1]}
      className="install-sheet"
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('install.title')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>{t('common.close')}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <ol className="install-steps">
          {steps.map((step) => (
            <li key={step.key}>
              <span>
                <Trans i18nKey={step.key} components={bold} />
              </span>
              {'icon' in step && (
                <IonIcon icon={step.icon} aria-hidden="true" className="install-steps__icon" />
              )}
            </li>
          ))}
        </ol>
        <p className="install-sheet__after">{t('install.after')}</p>
      </IonContent>
    </IonModal>
  );
}
