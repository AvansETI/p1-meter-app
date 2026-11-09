import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { TariffPeriod } from '@p1/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fromDraft, type AmountField, type DraftField, type PeriodDraft } from './draft';

interface Props {
  initial: PeriodDraft;
  hasExport: boolean;
  hasGas: boolean;
  /** Dates already used by other periods of the same profile. */
  takenDates: string[];
  onCancel: () => void;
  onSave: (period: TariffPeriod) => void;
}

/** Add/edit form for one tariff period (docs/design/2026-11-09-costs.md §7). */
export default function PeriodEditor({
  initial,
  hasExport,
  hasGas,
  takenDates,
  onCancel,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<PeriodDraft>(() => ({
    ...initial,
    // A household with gas always gets gas tariffs; one without never does.
    gasType: hasGas ? (initial.gasType === 'none' ? 'fixed' : initial.gasType) : 'none',
  }));
  const [invalid, setInvalid] = useState<Set<DraftField>>(new Set());

  const set = (field: DraftField, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const amount = (field: AmountField, unit: string, help?: string) => (
    <IonItem key={field}>
      <IonInput
        label={t(`tariffs.fields.${field}`)}
        labelPlacement="stacked"
        inputmode="decimal"
        value={draft[field]}
        helperText={help}
        errorText={t('tariffs.invalidAmount')}
        className={invalid.has(field) ? 'ion-invalid ion-touched' : undefined}
        onIonInput={(event) => set(field, String(event.detail.value ?? ''))}
      >
        <span slot="end">{unit}</span>
      </IonInput>
    </IonItem>
  );

  const submit = () => {
    const result = fromDraft(draft);
    const duplicate = takenDates.includes(draft.validFrom);
    if (!result.ok || duplicate) {
      setInvalid(
        new Set([
          ...(result.ok ? [] : result.fields),
          ...(duplicate ? ['validFrom' as const] : []),
        ]),
      );
      return;
    }
    onSave(result.period);
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onCancel}>{t('common.cancel')}</IonButton>
          </IonButtons>
          <IonTitle>{t('tariffs.periodTitle')}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={submit}>
              {t('tariffs.save')}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {invalid.size > 0 && (
          <p className="tariffs__error" role="alert">
            {t('tariffs.formInvalid')}
          </p>
        )}
        <IonList inset>
          <IonItem>
            <IonInput
              label={t('tariffs.fields.name')}
              labelPlacement="stacked"
              value={draft.name}
              maxlength={40}
              placeholder={t('tariffs.namePeriodPlaceholder')}
              helperText={t('tariffs.namePeriodHelp')}
              onIonInput={(event) => set('name', String(event.detail.value ?? ''))}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label={t('tariffs.fields.validFrom')}
              labelPlacement="stacked"
              type="date"
              value={draft.validFrom}
              helperText={t('tariffs.validFromHelp')}
              errorText={t('tariffs.invalidDate')}
              className={invalid.has('validFrom') ? 'ion-invalid ion-touched' : undefined}
              onIonInput={(event) => set('validFrom', String(event.detail.value ?? ''))}
            />
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>{t('tariffs.electricity')}</IonListHeader>
          <IonItem lines="none">
            <IonSegment
              value={draft.electricityType}
              onIonChange={(event) => set('electricityType', String(event.detail.value))}
            >
              {(['single', 'double', 'dynamic'] as const).map((type) => (
                <IonSegmentButton key={type} value={type}>
                  <IonLabel>{t(`tariffs.types.${type}`)}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
          </IonItem>
          {draft.electricityType === 'single' && amount('perKwh', '€/kWh', t('tariffs.inclHelp'))}
          {draft.electricityType === 'double' && [
            amount('normalPerKwh', '€/kWh', t('tariffs.inclHelp')),
            amount('offPeakPerKwh', '€/kWh', t('tariffs.offPeakHelp')),
          ]}
          {draft.electricityType === 'dynamic' && [
            amount('markupPerKwh', '€/kWh', t('tariffs.markupHelp')),
            amount('energyTaxPerKwh', '€/kWh', t('tariffs.energyTaxHelp')),
            amount('vatPercent', '%'),
          ]}
        </IonList>

        {hasExport && (
          <IonList inset>
            <IonListHeader>{t('tariffs.export')}</IonListHeader>
            {amount('compensationPerKwh', '€/kWh', t('tariffs.compensationHelp'))}
            {amount('feePerKwh', '€/kWh', t('tariffs.feeHelp'))}
            {draft.electricityType === 'dynamic' &&
              amount('dynamicMarkupPerKwh', '€/kWh', t('tariffs.dynamicMarkupHelp'))}
          </IonList>
        )}

        {hasGas && (
          <IonList inset>
            <IonListHeader>{t('tariffs.gas')}</IonListHeader>
            <IonItem lines="none">
              <IonSegment
                value={draft.gasType}
                onIonChange={(event) => set('gasType', String(event.detail.value))}
              >
                {(['fixed', 'dynamic'] as const).map((type) => (
                  <IonSegmentButton key={type} value={type}>
                    <IonLabel>{t(`tariffs.gasTypes.${type}`)}</IonLabel>
                  </IonSegmentButton>
                ))}
              </IonSegment>
            </IonItem>
            {draft.gasType === 'fixed' && amount('perM3', '€/m³', t('tariffs.inclHelp'))}
            {draft.gasType === 'dynamic' && [
              amount('markupPerM3', '€/m³', t('tariffs.markupHelp')),
              amount('energyTaxPerM3', '€/m³', t('tariffs.energyTaxHelp')),
              amount('gasVatPercent', '%'),
            ]}
          </IonList>
        )}

        <IonList inset>
          <IonListHeader>{t('tariffs.fixed')}</IonListHeader>
          {amount('supplierPerMonth', '€/mnd', t('tariffs.supplierHelp'))}
          {amount('gridPerMonth', '€/mnd', t('tariffs.gridHelp'))}
          {amount('taxReductionPerYear', '€/jaar', t('tariffs.taxReductionHelp'))}
        </IonList>
        <IonNote className="tariffs__note">{t('tariffs.statementHint')}</IonNote>
      </IonContent>
    </>
  );
}
