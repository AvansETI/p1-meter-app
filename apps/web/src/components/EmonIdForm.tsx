import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  IonText,
} from '@ionic/react';
import { DEFAULT_PROFILE } from '@p1/shared';
import { useTranslation } from 'react-i18next';
import { useEmonIdForm } from './useEmonIdForm';

const WIKI_URL = 'https://github.com/AvansETI/SmartMeter_DIY/wiki/5.-Aansluiten-op-SmartMeter';

/** EMON ID input with help and neutral error messages; used on Welcome and in Settings. */
export default function EmonIdForm({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation();
  const form = useEmonIdForm(onDone);

  return (
    <form
      className="emon-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.submit();
      }}
    >
      <div>
        <IonInput
          className={form.error ? 'emon-form__input ion-invalid ion-touched' : 'emon-form__input'}
          label={t('welcome.label')}
          labelPlacement="stacked"
          fill="outline"
          placeholder={t('welcome.placeholder')}
          value={form.value}
          inputmode="text"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck={false}
          maxlength={13}
          aria-invalid={form.error ? 'true' : undefined}
          aria-describedby="emon-form-error"
          onIonInput={(event) => {
            // Write back so the field shows the formatted value immediately.
            event.target.value = form.input(String(event.detail.value ?? ''));
          }}
        >
          <IonText slot="start" className="emon-form__prefix">
            {DEFAULT_PROFILE.prefix}-
          </IonText>
        </IonInput>
        <p id="emon-form-error" className="emon-form__error" role="alert">
          {form.error ? t(`welcome.errors.${form.error}`) : ''}
        </p>
      </div>

      <IonButton type="submit" expand="block" disabled={form.busy}>
        {form.busy ? (
          <>
            <IonSpinner name="dots" aria-hidden="true" />
            <span className="ion-padding-start">{t('welcome.checking')}</span>
          </>
        ) : (
          t('welcome.submit')
        )}
      </IonButton>

      <IonAccordionGroup className="emon-form__help">
        <IonAccordion value="help">
          <IonItem slot="header" lines="none">
            <IonLabel>{t('welcome.helpTitle')}</IonLabel>
          </IonItem>
          <div slot="content" className="ion-padding">
            <IonNote>{t('welcome.helpText')}</IonNote>
            <p>
              <a href={WIKI_URL} target="_blank" rel="noreferrer">
                {t('welcome.helpLink')}
              </a>
            </p>
          </div>
        </IonAccordion>
      </IonAccordionGroup>
    </form>
  );
}
