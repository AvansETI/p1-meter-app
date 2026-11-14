import { IonNote } from '@ionic/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { unwrap } from '../api/unwrap';
import { dateFormat } from '../i18n/dates';

const sinceDate = () => dateFormat({ day: 'numeric', month: 'short', year: 'numeric' });

/** "23 actieve gebruikers · 41 actieve meterkits (laatste 30 dagen)" (#63); hidden on error. */
export default function UsageStats() {
  const { t } = useTranslation();
  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: () => unwrap(api.getStats()),
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (!stats.isSuccess) return null;

  const { days, activeUsers, activeInstallations, usersSince } = stats.data;
  const parts = [
    usersSince
      ? t('settings.statsUsersSince', {
          count: activeUsers,
          // YYYY-MM-DD as a local date, not UTC midnight.
          date: sinceDate().format(new Date(`${usersSince}T00:00`)),
        })
      : t('settings.statsUsers', { count: activeUsers }),
  ];
  if (activeInstallations !== undefined) {
    parts.push(t('settings.statsKits', { count: activeInstallations }));
  }
  return (
    <IonNote className="about__stats">
      {parts.join(' · ')} {t('settings.statsPeriod', { days })}
    </IonNote>
  );
}
