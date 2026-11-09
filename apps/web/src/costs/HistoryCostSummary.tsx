import type { HistoryCosts, Period } from '@p1/shared';
import { useTranslation } from 'react-i18next';
import { formatEuro } from '../format';
import { costChange, contractDifference } from './compare';
import { CompareLine } from './CostTile';

/**
 * "Kosten" card on History (costs design §7.1): total with the change versus the previous
 * period, the comparison contract, and for the current month or year the forecast.
 */
export default function HistoryCostSummary({
  costs,
  period,
}: {
  costs: HistoryCosts;
  period: Period;
}) {
  const { t } = useTranslation();
  const change = costChange(costs.totals, costs.previous);
  const estimated = costs.buckets.some((b) => b.estimated);
  const forecast = costs.forecast;
  const forecastDifference = forecast && contractDifference(forecast.own, forecast.compare ?? null);

  return (
    <div className="cost-summary">
      <div className="today-item">
        <span className="today-item__label">{t('costs.title')}</span>
        <span className="today-item__value">
          {costs.totals.own === null ? '–' : formatEuro(costs.totals.own)}
          {estimated && <span className="cost-badge">{t('costs.estimated')}</span>}
        </span>
        {change === 'incomplete' && (
          <span className="history-change history-change--neutral">{t('history.incomplete')}</span>
        )}
        {change && change !== 'incomplete' && (
          <span className={`history-change history-change--${change.tone}`}>
            {t('history.change', {
              arrow: change.percent < 0 ? '▼' : '▲',
              percent: Math.abs(change.percent),
              period: t(`history.vs.${period}`),
            })}
          </span>
        )}
        {costs.compareName && (
          <CompareLine
            name={costs.compareName}
            own={costs.totals.own}
            other={costs.totals.compare ?? null}
          />
        )}
      </div>

      {forecast && forecast.own !== null && (
        <p className="cost-forecast">
          {t(`costs.forecast.${period === 'year' ? 'year' : 'month'}`, {
            amount: formatEuro(forecast.own),
          })}
          {costs.compareName && forecast.compare != null && (
            <>
              <br />
              {t('costs.compareLine', {
                name: costs.compareName,
                amount: formatEuro(forecast.compare),
              })}
              {forecastDifference && forecastDifference.tone !== 'same' && (
                <>
                  {' · '}
                  {t(`costs.${forecastDifference.tone}`, {
                    amount: formatEuro(forecastDifference.amount),
                  })}
                </>
              )}
            </>
          )}
          <br />
          <small>{t(`costs.basis.${forecast.basis}`)}</small>
        </p>
      )}
    </div>
  );
}
