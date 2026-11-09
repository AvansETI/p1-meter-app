import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { formatPlainDate, type TariffPeriod, type TariffProfiles } from '@p1/shared';
import { trashOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/unwrap';
import { today } from '../history/dates';
import { useSession } from '../session/context';
import { useSettings } from '../settings/context';
import { emptyDraft, summary, toDraft, type PeriodDraft } from '../tariffs/draft';
import PeriodEditor from '../tariffs/PeriodEditor';
import { useSaveTariffs, useTariffs, useTariffVersions } from '../tariffs/queries';

type ProfileKey = 'own' | 'compare';

const longDate = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long' });
const dateTime = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeStyle: 'short' });
const showDate = (plain: string) => longDate.format(new Date(`${plain}T12:00:00`));

interface Editing {
  profile: ProfileKey;
  /** validFrom of the period being edited; undefined when adding. */
  original?: string;
  draft: PeriodDraft;
}

function PeriodList({
  periods,
  onEdit,
  onDelete,
  onAdd,
}: {
  periods: TariffPeriod[];
  onEdit: (period: TariffPeriod) => void;
  onDelete: (period: TariffPeriod) => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  // Newest first: that is the one that applies now.
  const newestFirst = [...periods].reverse();
  return (
    <>
      {newestFirst.map((period) => (
        <IonItem key={period.validFrom} button detail onClick={() => onEdit(period)}>
          <IonLabel>
            {period.name ? (
              <>
                <h3>{period.name}</h3>
                <p>
                  {t('tariffs.fromLower', { date: showDate(period.validFrom) })} · {summary(period)}
                </p>
              </>
            ) : (
              <>
                <h3>{t('tariffs.from', { date: showDate(period.validFrom) })}</h3>
                <p>{summary(period)}</p>
              </>
            )}
          </IonLabel>
          <IonButton
            slot="end"
            fill="clear"
            color="medium"
            aria-label={t('tariffs.deletePeriod')}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(period);
            }}
          >
            <IonIcon icon={trashOutline} slot="icon-only" aria-hidden="true" />
          </IonButton>
        </IonItem>
      ))}
      <IonItem button detail={false} onClick={onAdd}>
        <IonLabel color="primary">{t('tariffs.addPeriod')}</IonLabel>
      </IonItem>
    </>
  );
}

/** Settings → Tarieven: own contract and an optional comparison (costs design §7). */
export default function TariffsPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { state } = useSession();
  const ready = state.status === 'ready';
  const hasExport = ready && state.capabilities.hasExport;
  const hasGas = ready && state.capabilities.hasGas;

  const query = useTariffs(settings.emonId, ready);
  const { save, restore } = useSaveTariffs(settings.emonId);
  const [showVersions, setShowVersions] = useState(false);
  const versions = useTariffVersions(settings.emonId, ready && showVersions);

  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<{ profile: ProfileKey; validFrom: string } | null>(null);
  const [naming, setNaming] = useState(false);
  const [removingCompare, setRemovingCompare] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const data = query.data;
  const profiles = data?.profiles;

  const failed = (error: unknown) => {
    const code = error instanceof ApiError ? error.code : 'upstream_unavailable';
    setMessage(
      code === 'conflict' || code === 'rate_limited'
        ? t(`tariffs.errors.${code}`)
        : t('tariffs.errors.other'),
    );
  };

  const store = (next: TariffProfiles, done?: () => void) => {
    if (!data) return;
    save.mutate(
      { profiles: next, version: data.version },
      {
        onSuccess: () => {
          done?.();
          setMessage(t('tariffs.saved'));
        },
        onError: failed,
      },
    );
  };

  const withPeriods = (profile: ProfileKey, periods: TariffPeriod[]): TariffProfiles | null => {
    if (!profiles) return null;
    if (profile === 'own') return { ...profiles, own: { periods } };
    return profiles.compare ? { ...profiles, compare: { ...profiles.compare, periods } } : null;
  };

  const periodsOf = (profile: ProfileKey) =>
    (profile === 'own' ? profiles?.own.periods : profiles?.compare?.periods) ?? [];

  const add = (profile: ProfileKey) => {
    const latest = periodsOf(profile).at(-1);
    const date = formatPlainDate(today());
    // Start from the latest period: usually only a few amounts change.
    const draft = latest ? { ...toDraft(latest), validFrom: date } : emptyDraft(date, hasGas);
    setEditing({ profile, draft });
  };

  const saveEdited = (period: TariffPeriod) => {
    if (!editing) return;
    const others = periodsOf(editing.profile).filter((p) => p.validFrom !== editing.original);
    const next = withPeriods(
      editing.profile,
      [...others, period].sort((a, b) => a.validFrom.localeCompare(b.validFrom)),
    );
    if (next) store(next, () => setEditing(null));
  };

  const section = (profile: ProfileKey) => (
    <PeriodList
      periods={periodsOf(profile)}
      onEdit={(period) =>
        setEditing({ profile, original: period.validFrom, draft: toDraft(period) })
      }
      onDelete={(period) => setDeleting({ profile, validFrom: period.validFrom })}
      onAdd={() => add(profile)}
    />
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" text={t('settings.title')} />
          </IonButtons>
          <IonTitle>{t('tariffs.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {query.isPending && (
          <IonList inset>
            <IonItem>
              <IonSpinner name="dots" slot="start" aria-hidden="true" />
              <IonLabel>{t('settings.loading')}</IonLabel>
            </IonItem>
          </IonList>
        )}
        {query.isError && (
          <p className="live__error">
            {t('tariffs.loadError')}{' '}
            <IonButton size="small" fill="clear" onClick={() => void query.refetch()}>
              {t('history.retry')}
            </IonButton>
          </p>
        )}

        {profiles && (
          <>
            <p className="tariffs__intro">{t('tariffs.intro')}</p>
            <IonList inset>
              <IonListHeader>{t('tariffs.own')}</IonListHeader>
              {profiles.own.periods.length === 0 && (
                <IonItem>
                  <IonLabel className="ion-text-wrap">
                    <IonNote>{t('tariffs.empty')}</IonNote>
                  </IonLabel>
                </IonItem>
              )}
              {section('own')}
            </IonList>

            <IonList inset>
              <IonListHeader>
                {profiles.compare
                  ? t('tariffs.compareNamed', { name: profiles.compare.name })
                  : t('tariffs.compare')}
              </IonListHeader>
              {profiles.compare ? (
                <>
                  {section('compare')}
                  <IonItem button detail={false} onClick={() => setNaming(true)}>
                    <IonLabel color="primary">{t('tariffs.rename')}</IonLabel>
                  </IonItem>
                  <IonItem button detail={false} onClick={() => setRemovingCompare(true)}>
                    <IonLabel color="danger">{t('tariffs.removeCompare')}</IonLabel>
                  </IonItem>
                </>
              ) : (
                <>
                  <IonItem>
                    <IonLabel className="ion-text-wrap">
                      <IonNote>{t('tariffs.compareHelp')}</IonNote>
                    </IonLabel>
                  </IonItem>
                  <IonItem button detail={false} onClick={() => setNaming(true)}>
                    <IonLabel color="primary">{t('tariffs.addCompare')}</IonLabel>
                  </IonItem>
                </>
              )}
            </IonList>

            {data.version > 0 && (
              <IonList inset>
                <IonItem button detail onClick={() => setShowVersions(true)}>
                  <IonLabel>{t('tariffs.versions')}</IonLabel>
                  {data.updatedAt && (
                    <IonNote slot="end">
                      {t('tariffs.lastChanged', {
                        time: dateTime.format(new Date(data.updatedAt)),
                      })}
                    </IonNote>
                  )}
                </IonItem>
              </IonList>
            )}
          </>
        )}

        <IonModal isOpen={editing !== null} onDidDismiss={() => setEditing(null)}>
          {editing && (
            <PeriodEditor
              initial={editing.draft}
              hasExport={hasExport}
              hasGas={hasGas}
              takenDates={periodsOf(editing.profile)
                .map((p) => p.validFrom)
                .filter((d) => d !== editing.original)}
              onCancel={() => setEditing(null)}
              onSave={saveEdited}
            />
          )}
        </IonModal>

        <IonModal isOpen={showVersions} onDidDismiss={() => setShowVersions(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t('tariffs.versions')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowVersions(false)}>{t('common.close')}</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList inset>
              {versions.isPending && (
                <IonItem>
                  <IonSpinner name="dots" aria-hidden="true" />
                </IonItem>
              )}
              {versions.data?.map((version) => (
                <IonItem key={version.version}>
                  <IonLabel className="ion-text-wrap">
                    <h3>
                      {t('tariffs.version', { version: version.version })}
                      {version.version === data?.version && ` · ${t('tariffs.current')}`}
                    </h3>
                    <p>{dateTime.format(new Date(version.createdAt))}</p>
                    <p>
                      {t('tariffs.versionSummary', {
                        count: version.ownPeriods,
                      })}
                      {version.compareName &&
                        ` · ${t('tariffs.versionCompare', { name: version.compareName })}`}
                    </p>
                  </IonLabel>
                  {version.version !== data?.version && (
                    <IonButton
                      slot="end"
                      fill="clear"
                      onClick={() => setRestoring(version.version)}
                    >
                      {t('tariffs.restore')}
                    </IonButton>
                  )}
                </IonItem>
              ))}
            </IonList>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={deleting !== null}
          header={t('tariffs.deleteTitle')}
          message={deleting ? t('tariffs.deleteText', { date: showDate(deleting.validFrom) }) : ''}
          buttons={[
            { text: t('common.cancel'), role: 'cancel' },
            {
              text: t('tariffs.delete'),
              role: 'destructive',
              handler: () => {
                if (!deleting) return;
                const next = withPeriods(
                  deleting.profile,
                  periodsOf(deleting.profile).filter((p) => p.validFrom !== deleting.validFrom),
                );
                if (next) store(next);
              },
            },
          ]}
          onDidDismiss={() => setDeleting(null)}
        />

        <IonAlert
          isOpen={naming}
          header={profiles?.compare ? t('tariffs.rename') : t('tariffs.addCompare')}
          message={t('tariffs.nameHelp')}
          inputs={[
            {
              name: 'name',
              type: 'text',
              value: profiles?.compare?.name ?? '',
              placeholder: t('tariffs.namePlaceholder'),
              attributes: { maxlength: 40 },
            },
          ]}
          buttons={[
            { text: t('common.cancel'), role: 'cancel' },
            {
              text: t('tariffs.save'),
              handler: (values: { name?: string }) => {
                const name = (values.name ?? '').trim();
                if (!profiles || name.length === 0) return false;
                store({
                  ...profiles,
                  compare: { name, periods: profiles.compare?.periods ?? [] },
                });
                return true;
              },
            },
          ]}
          onDidDismiss={() => setNaming(false)}
        />

        <IonAlert
          isOpen={removingCompare}
          header={t('tariffs.removeCompareTitle')}
          message={t('tariffs.removeCompareText')}
          buttons={[
            { text: t('common.cancel'), role: 'cancel' },
            {
              text: t('tariffs.delete'),
              role: 'destructive',
              handler: () => {
                if (profiles) store({ own: profiles.own });
              },
            },
          ]}
          onDidDismiss={() => setRemovingCompare(false)}
        />

        <IonAlert
          isOpen={restoring !== null}
          header={t('tariffs.restoreTitle', { version: restoring })}
          message={t('tariffs.restoreText')}
          buttons={[
            { text: t('common.cancel'), role: 'cancel' },
            {
              text: t('tariffs.restore'),
              handler: () => {
                if (restoring === null) return;
                restore.mutate(restoring, {
                  onSuccess: () => {
                    setShowVersions(false);
                    setMessage(t('tariffs.restored', { version: restoring }));
                  },
                  onError: failed,
                });
              },
            },
          ]}
          onDidDismiss={() => setRestoring(null)}
        />

        <IonToast
          isOpen={message !== null}
          message={message ?? ''}
          duration={3000}
          onDidDismiss={() => setMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
}
