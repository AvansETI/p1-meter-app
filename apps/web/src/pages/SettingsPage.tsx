import {
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { formatDynamicPart, type Capabilities } from '@p1/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../components/BrandLogo';
import EmonIdForm from '../components/EmonIdForm';
import { useSession } from '../session/context';
import { useSettings } from '../settings/context';
import { ThemeSchema } from '../settings/storage';

const PROJECT_URL = 'https://github.com/AvansETI/SmartMeter_DIY';

const dateTime = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeStyle: 'short' });

/** Shows only what this household actually has: no export row without export, etc. */
function MeterInfo({ capabilities }: { capabilities: Capabilities }) {
  const { t } = useTranslation();
  const measured = [
    t('settings.measuredElectricity'),
    ...(capabilities.hasExport ? [t('settings.export')] : []),
    ...(capabilities.hasGas ? [t('settings.gas')] : []),
  ];
  const counters = {
    'as-named': t('settings.countersAsNamed'),
    swapped: t('settings.countersSwapped'),
    unknown: t('settings.countersUnknown'),
  }[capabilities.counterOrientation];

  return (
    <>
      <IonItem>
        <IonLabel>{t('settings.measured')}</IonLabel>
        <IonNote slot="end">{measured.join(', ')}</IonNote>
      </IonItem>
      <IonItem>
        <IonLabel className="ion-text-wrap">
          {t('settings.counters')}
          {capabilities.counterOrientation === 'swapped' && (
            <p>{t('settings.countersSwappedHelp')}</p>
          )}
        </IonLabel>
        <IonNote slot="end">{counters}</IonNote>
      </IonItem>
      <IonItem>
        <IonLabel>{t('settings.lastSeen')}</IonLabel>
        <IonNote slot="end">{dateTime.format(new Date(capabilities.lastSeen))}</IonNote>
      </IonItem>
    </>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { settings, setTheme } = useSettings();
  const { state, clear } = useSession();
  const [changing, setChanging] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('settings.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonListHeader>{t('settings.meter')}</IonListHeader>
          <IonItem>
            <IonLabel>{t('settings.emonId')}</IonLabel>
            <IonNote slot="end" className="settings__emon-id">
              {settings.emonId ? formatDynamicPart(settings.emonId) : '—'}
            </IonNote>
          </IonItem>
          <IonItem button detail={false} onClick={() => setChanging(true)}>
            <IonLabel color="primary">{t('settings.change')}</IonLabel>
          </IonItem>
          <IonItem button detail={false} onClick={() => setConfirmRemove(true)}>
            <IonLabel color="danger">{t('settings.remove')}</IonLabel>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>{t('settings.meterInfo')}</IonListHeader>
          {state.status === 'ready' && <MeterInfo capabilities={state.capabilities} />}
          {state.status === 'loading' && (
            <IonItem>
              <IonSpinner name="dots" slot="start" aria-hidden="true" />
              <IonLabel>{t('settings.loading')}</IonLabel>
            </IonItem>
          )}
          {state.status === 'error' && (
            <IonItem>
              <IonLabel className="ion-text-wrap">{t('settings.unavailable')}</IonLabel>
            </IonItem>
          )}
        </IonList>

        <IonList inset>
          <IonListHeader>{t('settings.display')}</IonListHeader>
          <IonItem>
            <IonLabel>{t('settings.theme')}</IonLabel>
          </IonItem>
          <IonItem lines="none">
            <IonSegment
              value={settings.theme}
              onIonChange={(event) => {
                const theme = ThemeSchema.safeParse(event.detail.value);
                if (theme.success) setTheme(theme.data);
              }}
            >
              <IonSegmentButton value="system">
                <IonLabel>{t('settings.themeSystem')}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="light">
                <IonLabel>{t('settings.themeLight')}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="dark">
                <IonLabel>{t('settings.themeDark')}</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>{t('settings.about')}</IonListHeader>
          <div className="about">
            <BrandLogo className="about__logo" />
            <p className="about__lectorate">{t('settings.aboutLectorate')}</p>
            <p>{t('settings.aboutPartners')}</p>
            <p>{t('settings.aboutAuthor')}</p>
            <IonNote>{t('settings.version', { version: __APP_VERSION__ })}</IonNote>
            <a href={PROJECT_URL} target="_blank" rel="noreferrer">
              {t('settings.aboutProject')}
            </a>
          </div>
        </IonList>

        <IonModal isOpen={changing} onDidDismiss={() => setChanging(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t('settings.changeTitle')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setChanging(false)}>{t('common.close')}</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <EmonIdForm onDone={() => setChanging(false)} />
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={confirmRemove}
          header={t('settings.removeConfirmTitle')}
          message={t('settings.removeConfirmText')}
          buttons={[
            { text: t('common.cancel'), role: 'cancel' },
            { text: t('settings.remove'), role: 'destructive', handler: () => void clear() },
          ]}
          onDidDismiss={() => setConfirmRemove(false)}
        />
      </IonContent>
    </IonPage>
  );
}
