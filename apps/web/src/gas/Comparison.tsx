import {
  AREA_M2,
  type CbsFigures,
  type Distribution,
  type GasComparison,
  type GasProfile,
} from '@p1/shared';
import { useTranslation } from 'react-i18next';
import { profileSummary } from './profileText';

const whole = (v: number) => Math.round(v).toLocaleString('nl-NL');
const decimal = (v: number) => v.toLocaleString('nl-NL', { maximumFractionDigits: 1 });

interface BandValues {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

/**
 * A horizontal band from P10 to P90 (darker P25–P75), the median as a tick and the household
 * as a marker. Lower is better, so the scale runs from little to much gas.
 */
export function Band({
  values,
  own,
  format,
  label,
}: {
  values: BandValues;
  own: number | null;
  format: (v: number) => string;
  label: string;
}) {
  const lo = Math.min(values.p10, own ?? Infinity) * 0.9;
  const hi = Math.max(values.p90, own ?? -Infinity) * 1.05;
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="gas-band" role="img" aria-label={label}>
      <div className="gas-band__track">
        <span
          className="gas-band__outer"
          style={{ left: pos(values.p10), width: `calc(${pos(values.p90)} - ${pos(values.p10)})` }}
        />
        <span
          className="gas-band__inner"
          style={{ left: pos(values.p25), width: `calc(${pos(values.p75)} - ${pos(values.p25)})` }}
        />
        <span className="gas-band__median" style={{ left: pos(values.p50) }} />
        {own !== null && <span className="gas-band__own" style={{ left: pos(own) }} />}
      </div>
      <div className="gas-band__scale">
        <span>{format(values.p10)}</span>
        <span>{format(values.p50)}</span>
        <span>{format(values.p90)}</span>
      </div>
    </div>
  );
}

const cbsBand = (f: CbsFigures): BandValues => ({
  p10: f.p10,
  // CBS publishes deciles; P20/P80 stand in for the quartiles of the inner band.
  p25: f.p20,
  p50: f.p50,
  p75: f.p80,
  p90: f.p90,
});

function AppComparison({
  title,
  distribution,
  own,
}: {
  title: string;
  distribution: Distribution;
  own: number | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="gas-compare">
      <h3>{title}</h3>
      <p className="gas-compare__lead">
        {distribution.percentile === null
          ? t('gas.compareNoOwn', { count: distribution.n })
          : t('gas.comparePercentile', {
              share: 100 - distribution.percentile,
              count: distribution.n,
            })}
      </p>
      <Band
        values={distribution}
        own={own}
        format={(v) => `${whole(v)} m³`}
        label={t('gas.bandLabel', { median: whole(distribution.p50) })}
      />
    </div>
  );
}

/** App households, the profile group and CBS (design §7.1, card 6). */
export default function Comparison({
  comparison,
  profile,
}: {
  comparison: GasComparison;
  profile: GasProfile;
}) {
  const { t } = useTranslation();
  const { own, all, group, cbs } = comparison;
  const area = profile.area ? AREA_M2[profile.area] : undefined;
  return (
    <div className="gas-comparison">
      <p>{own === null ? t('gas.ownUnknown') : t('gas.ownReference', { m3: whole(own) })}</p>
      {all ? (
        <AppComparison title={t('gas.compareAll')} distribution={all} own={own} />
      ) : (
        <p className="history-hint">{t('gas.compareTooFew')}</p>
      )}
      {group && (
        <AppComparison
          title={t('gas.compareGroup', { group: profileSummary(group.profile, t) })}
          distribution={group}
          own={own}
        />
      )}
      {comparison.shared && !group && <p className="history-hint">{t('gas.groupTooSmall')}</p>}
      {cbs && (
        <div className="gas-compare">
          <h3>
            {t('gas.compareCbs', {
              year: cbs.year,
              group: profileSummary(cbs.profile, t) || t('gas.allDwellings'),
            })}
          </h3>
          <p className="gas-compare__lead">
            {t('gas.cbsMean', {
              mean: whole(cbs.perDwelling.mean),
              median: whole(cbs.perDwelling.p50),
            })}
          </p>
          <Band
            values={cbsBand(cbs.perDwelling)}
            own={own}
            format={(v) => `${whole(v)} m³`}
            label={t('gas.bandLabel', { median: whole(cbs.perDwelling.p50) })}
          />
          {cbs.perM2 && area !== undefined && (
            <>
              <p className="gas-compare__lead">
                {own === null
                  ? t('gas.cbsPerM2Median', { median: decimal(cbs.perM2.p50) })
                  : t('gas.cbsPerM2', { own: decimal(own / area), median: decimal(cbs.perM2.p50) })}
              </p>
              <Band
                values={cbsBand(cbs.perM2)}
                own={own === null ? null : own / area}
                format={(v) => `${decimal(v)} m³/m²`}
                label={t('gas.bandLabel', { median: decimal(cbs.perM2.p50) })}
              />
            </>
          )}
          {profile.heating === 'hybrid' && <p className="history-hint">{t('gas.hybridNote')}</p>}
          <p className="history-hint">{t('gas.cbsNote')}</p>
        </div>
      )}
      <p className="history-hint gas-attribution">{t('gas.attribution')}</p>
    </div>
  );
}
