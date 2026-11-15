import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/react';
import {
  BUILD_PERIODS,
  DegreeDayMethodSchema,
  DWELLING_TYPES,
  YearDivisionSchema,
  FLOOR_AREAS,
  HEATINGS,
  MAX_BASE_TEMPERATURE,
  MIN_BASE_TEMPERATURE,
  postcodeRegion,
  RESIDENTS,
  STATIONS,
  type GasProfile,
} from '@p1/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGasAnalysis } from '../gas/queries';
import { useGasSaveFailed } from '../gas/sync';
import { useTariffs } from '../tariffs/queries';
import { dateFormat } from '../i18n/dates';
import { DAYS_PER_MONTH } from '../gas/units';
import { stationOf } from '../gas/station';
import { useSession } from '../session/context';
import { useSettings } from '../settings/context';

/** Select value for "unknown"; IonSelect cannot hold undefined. */
const UNKNOWN = '';
const AUTO = 'auto';

const BASES = Array.from(
  { length: (MAX_BASE_TEMPERATURE - MIN_BASE_TEMPERATURE) * 2 + 1 },
  (_, i) => MIN_BASE_TEMPERATURE + i / 2,
);
/** "1 april" from a date or "MM-DD". */
const monthDay = (value: string) =>
  dateFormat({ day: 'numeric', month: 'long' }).format(
    new Date(`2026-${value.slice(-5)}T12:00:00`),
  );
const decimal = (v: number) => v.toLocaleString('nl-NL', { maximumFractionDigits: 2 });

/** Settings → Gas analysis (docs/design/2026-11-15-gas-analysis.md §7.2). */
/** Expected annual use in m³, or undefined when the text is empty or out of range. */
function parseExpected(text: string): number | undefined {
  const value = Number(text.replace(/\D/g, ''));
  return text.trim() !== '' && value >= 1 && value <= 20000 ? value : undefined;
}

/** Baseline typed in m³ per month, stored per day; undefined when empty or out of range. */
function parseBaseline(text: string): number | undefined {
  const perMonth = Number(text.replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(perMonth) && perMonth >= 0 && perMonth <= 600
    ? perMonth / DAYS_PER_MONTH
    : undefined;
}

/**
 * Text of an input for a setting. A value taken over from another device replaces the text,
 * but not while it is being typed here: the text then still means the same value.
 */
function useSyncedText<T>(value: T, parse: (text: string) => T, format: (value: T) => string) {
  const [text, setText] = useState(() => format(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (parse(text) !== value) setText(format(value));
  }
  return [text, setText] as const;
}

export default function GasSettingsPage() {
  const { t } = useTranslation();
  const { settings, setGas } = useSettings();
  const { state } = useSession();
  const { gas } = settings;
  const { station, located } = stationOf(gas);
  const ready = state.status === 'ready' && state.capabilities.hasGas;
  const analysis = useGasAnalysis(settings.emonId, gas, ready);
  const saveFailed = useGasSaveFailed();
  const [postcode, setPostcode] = useSyncedText(
    gas.postcode,
    (text) => postcodeRegion(text) ?? undefined,
    (value) => value ?? '',
  );
  const [expected, setExpected] = useSyncedText(gas.expected, parseExpected, (value) =>
    value === undefined ? '' : String(value),
  );
  const tariffs = useTariffs(settings.emonId, ready && gas.years === 'contract');
  // The default contract start: the newest own tariff period with gas.
  const tariffStart = tariffs.data?.profiles.own.periods.filter((p) => p.gas).at(-1)?.validFrom;
  // Shown per month in whole m³; stored per day like the API expects.
  const [baseline, setBaseline] = useSyncedText(gas.baseline, parseBaseline, (value) =>
    value === undefined ? '' : String(Math.round(value * DAYS_PER_MONTH)),
  );

  const updateProfile = (patch: Partial<GasProfile>) => {
    const profile = Object.fromEntries(
      Object.entries({ ...gas.profile, ...patch }).filter(([, v]) => v !== undefined),
    ) as GasProfile;
    setGas({ profile });
  };

  const select = <T extends string>(
    field: 'type' | 'area' | 'period' | 'residents' | 'heating',
    values: readonly T[],
    label: (value: T) => string,
  ) => (
    <IonItem>
      <IonSelect
        label={t(`gas.profile.${field}`)}
        interface="popover"
        value={gas.profile[field] ?? UNKNOWN}
        onIonChange={(e) => {
          const value = e.detail.value as string;
          updateProfile({ [field]: value === UNKNOWN ? undefined : value });
        }}
      >
        <IonSelectOption value={UNKNOWN}>{t('gas.unknown')}</IonSelectOption>
        {values.map((v) => (
          <IonSelectOption key={v} value={v}>
            {label(v)}
          </IonSelectOption>
        ))}
      </IonSelect>
    </IonItem>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" text={t('settings.title')} />
          </IonButtons>
          <IonTitle>{t('gas.settingsTitle')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {saveFailed && (
          <p className="gas-settings__error" role="status">
            {t('gas.saveFailed')}
          </p>
        )}
        <IonList inset>
          <IonListHeader>{t('gas.location')}</IonListHeader>
          <IonItem>
            <IonInput
              label={t('gas.postcode')}
              labelPlacement="stacked"
              inputmode="numeric"
              maxlength={2}
              placeholder="35"
              value={postcode}
              helperText={t('gas.postcodeHelp')}
              errorText={t('gas.postcodeInvalid')}
              className={
                postcode.length === 2 && !postcodeRegion(postcode) ? 'ion-invalid ion-touched' : ''
              }
              onIonInput={(e) => {
                // Only two digits: anything else is removed while typing.
                const value = String(e.detail.value ?? '')
                  .replace(/\D/g, '')
                  .slice(0, 2);
                e.target.value = value;
                setPostcode(value);
                const region = value.length === 2 ? postcodeRegion(value) : null;
                if (region || value === '') setGas({ postcode: region ?? undefined });
              }}
            />
          </IonItem>
          <IonItem>
            <IonSelect
              label={t('gas.stationLabel')}
              interface="popover"
              value={gas.station ?? AUTO}
              onIonChange={(e) => {
                const value = e.detail.value as string | number;
                setGas({ station: value === AUTO ? undefined : Number(value) });
              }}
            >
              <IonSelectOption value={AUTO}>{t('gas.stationAuto')}</IonSelectOption>
              {[...STATIONS]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => (
                  <IonSelectOption key={s.code} value={s.code}>
                    {s.name}
                  </IonSelectOption>
                ))}
            </IonSelect>
          </IonItem>
          <IonItem lines="none">
            <IonLabel className="ion-text-wrap">
              <p>
                {located
                  ? t('gas.stationInUse', { name: station.name })
                  : t('gas.stationDefault', { name: station.name })}
              </p>
            </IonLabel>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>{t('gas.degreeDaysTitle')}</IonListHeader>
          <IonItem lines="none">
            <IonSegment
              className="gas-method"
              value={gas.method}
              onIonChange={(e) => {
                const method = DegreeDayMethodSchema.safeParse(e.detail.value);
                if (method.success) setGas({ method: method.data });
              }}
            >
              <IonSegmentButton value="plain">
                <IonLabel>{t('gas.method.plain')}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="weighted">
                <IonLabel>{t('gas.method.weighted')}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="effective">
                <IonLabel>{t('gas.method.effective')}</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonItem>
          <IonItem>
            <IonLabel className="ion-text-wrap">
              <p>{t(`gas.methodHelp.${gas.method}`)}</p>
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonSelect
              label={t('gas.baseTemperature')}
              interface="popover"
              value={gas.base}
              onIonChange={(e) => setGas({ base: Number(e.detail.value) })}
            >
              {BASES.map((b) => (
                <IonSelectOption key={b} value={b}>
                  {decimal(b)} °C
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>{t('gas.yearsSettingsTitle')}</IonListHeader>
          <IonItem lines="none">
            <IonSegment
              className="gas-method"
              value={gas.years}
              onIonChange={(e) => {
                const years = YearDivisionSchema.safeParse(e.detail.value);
                if (years.success) setGas({ years: years.data });
              }}
            >
              <IonSegmentButton value="calendar">
                <IonLabel>{t('gas.division.calendar')}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="contract">
                <IonLabel>{t('gas.division.contract')}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="heating">
                <IonLabel>{t('gas.division.heating')}</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonItem>
          <IonItem>
            <IonLabel className="ion-text-wrap">
              <p>{t(`gas.divisionHelp.${gas.years}`)}</p>
            </IonLabel>
          </IonItem>
          {gas.years === 'contract' && (
            <IonItem>
              <IonInput
                label={t('gas.contractStart')}
                labelPlacement="stacked"
                type="date"
                value={gas.contractStart ? `2026-${gas.contractStart}` : ''}
                helperText={
                  tariffStart
                    ? t('gas.contractStartTariffs', { date: monthDay(tariffStart) })
                    : t('gas.contractStartNone')
                }
                onIonChange={(e) => {
                  const value = String(e.detail.value ?? '');
                  setGas({ contractStart: value ? value.slice(5, 10) : undefined });
                }}
              />
            </IonItem>
          )}
          <IonItem>
            <IonInput
              label={t('gas.expected')}
              labelPlacement="stacked"
              inputmode="numeric"
              value={expected}
              placeholder="1200"
              helperText={t('gas.expectedHelp')}
              onIonInput={(e) => {
                const text = String(e.detail.value ?? '');
                setExpected(text);
                const value = parseExpected(text);
                if (text.trim() === '' || value !== undefined) setGas({ expected: value });
              }}
            />
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>{t('gas.useTitle')}</IonListHeader>
          <IonItem lines="none">
            <IonToggle
              checked={gas.cooking}
              onIonChange={(e) => setGas({ cooking: e.detail.checked })}
            >
              {t('gas.cooking')}
            </IonToggle>
          </IonItem>
          <IonItem>
            <IonLabel className="ion-text-wrap">
              <p>{t('gas.cookingHelp')}</p>
            </IonLabel>
          </IonItem>
          {gas.cooking && (
            <IonItem>
              <IonInput
                label={t('gas.baselineLabel')}
                labelPlacement="stacked"
                inputmode="decimal"
                value={baseline}
                placeholder={
                  analysis.data?.baseline.auto != null
                    ? t('gas.baselineAuto', {
                        value: Math.round(analysis.data.baseline.auto * DAYS_PER_MONTH),
                      })
                    : t('gas.baselineAutoUnknown')
                }
                helperText={t('gas.baselineHelp')}
                onIonInput={(e) => {
                  const text = String(e.detail.value ?? '');
                  setBaseline(text);
                  const value = parseBaseline(text);
                  if (text.trim() === '' || value !== undefined) setGas({ baseline: value });
                }}
              />
            </IonItem>
          )}
        </IonList>

        <IonList inset>
          <IonListHeader>{t('gas.profileTitle')}</IonListHeader>
          {select('type', DWELLING_TYPES, (v) => t(`gas.type.${v}`))}
          {select('area', FLOOR_AREAS, (v) => t(`gas.area.${v}`))}
          {select('period', BUILD_PERIODS, (v) => t(`gas.period.${v}`))}
          {select('residents', RESIDENTS, (v) => t(`gas.residents.${v}`))}
          <IonItem>
            <IonSelect
              label={t('gas.profile.solar')}
              interface="popover"
              value={gas.profile.solar === undefined ? UNKNOWN : String(gas.profile.solar)}
              onIonChange={(e) => {
                const value = e.detail.value as string;
                updateProfile({ solar: value === UNKNOWN ? undefined : value === 'true' });
              }}
            >
              <IonSelectOption value={UNKNOWN}>{t('gas.unknown')}</IonSelectOption>
              <IonSelectOption value="true">{t('gas.solarYes')}</IonSelectOption>
              <IonSelectOption value="false">{t('gas.solarNo')}</IonSelectOption>
            </IonSelect>
          </IonItem>
          {select('heating', HEATINGS, (v) => t(`gas.heating.${v}`))}
          <IonItem lines="none">
            <IonLabel className="ion-text-wrap">
              <p>{t('gas.profileHelp')}</p>
            </IonLabel>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>{t('gas.shareTitle')}</IonListHeader>
          <IonItem>
            <IonToggle checked={gas.share} onIonChange={(e) => setGas({ share: e.detail.checked })}>
              <IonLabel className="ion-text-wrap">{t('gas.share')}</IonLabel>
            </IonToggle>
          </IonItem>
          <IonItem lines="none">
            <IonLabel className="ion-text-wrap">
              <p>{t('gas.shareHelp')}</p>
            </IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
}
