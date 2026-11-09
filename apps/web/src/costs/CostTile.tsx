import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { CostsToday, ProfileCost } from '@p1/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatEuro } from '../format';
import { contractDifference } from './compare';

const amount = (cost: ProfileCost | undefined) =>
  cost && 'totalEur' in cost ? cost.totalEur : null;

/** "Met Dynamisch: € 2,71 · € 0,41 goedkoper" below an amount. */
export function CompareLine({
  name,
  own,
  other,
}: {
  name: string;
  own: number | null;
  other: number | null;
}) {
  const { t } = useTranslation();
  const difference = contractDifference(own, other);
  return (
    <span className="cost-compare">
      {t('costs.compareLine', { name, amount: other === null ? '–' : formatEuro(other) })}
      {difference && difference.tone !== 'same' && (
        <>
          {' · '}
          <span className={`cost-compare__difference cost-compare__difference--${difference.tone}`}>
            {t(`costs.${difference.tone}`, { amount: formatEuro(difference.amount) })}
          </span>
        </>
      )}
    </span>
  );
}

function Breakdown({ title, cost }: { title: string; cost: ProfileCost }) {
  const { t } = useTranslation();
  if (!('totalEur' in cost)) {
    return (
      <section className="cost-breakdown">
        <h3>{title}</h3>
        <p className="cost-breakdown__unknown">{t(`costs.unknown.${cost.unknown}`)}</p>
      </section>
    );
  }
  const rows: Array<[string, number]> = [
    [t('costs.electricity'), cost.electricityEur],
    [t('costs.gas'), cost.gasEur],
    [t('costs.fixed'), cost.fixedEur],
    [t('costs.taxReduction'), -cost.taxReductionEur],
  ];
  return (
    <section className="cost-breakdown">
      <h3>{title}</h3>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{formatEuro(value)}</dd>
          </div>
        ))}
        <div className="cost-breakdown__total">
          <dt>{t('costs.total')}</dt>
          <dd>{formatEuro(cost.totalEur)}</dd>
        </div>
      </dl>
      {cost.estimated && <p className="cost-breakdown__note">{t('costs.estimatedNote')}</p>}
    </section>
  );
}

/** "Kosten vandaag" on Live; tap for the breakdown of both contracts (costs design §7.1). */
export default function CostTile({ costs }: { costs: CostsToday | undefined }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!costs) return <IonSkeletonText animated className="cost-tile cost-tile--skeleton" />;
  if (!costs.configured || !costs.own) return null;

  const own = amount(costs.own);
  const estimated = 'totalEur' in costs.own && costs.own.estimated;
  return (
    <>
      <button type="button" className="cost-tile" onClick={() => setOpen(true)}>
        <span className="cost-tile__value">
          {own === null ? '–' : formatEuro(own)}
          {estimated && <span className="cost-badge">{t('costs.estimated')}</span>}
        </span>
        {own === null && 'unknown' in costs.own && (
          <span className="cost-tile__note">{t(`costs.unknown.${costs.own.unknown}`)}</span>
        )}
        {costs.compare && (
          <CompareLine name={costs.compare.name} own={own} other={amount(costs.compare.cost)} />
        )}
        <span className="cost-tile__more">{t('costs.details')}</span>
      </button>

      <IonModal
        isOpen={open}
        onDidDismiss={() => setOpen(false)}
        breakpoints={[0, 0.75, 1]}
        initialBreakpoint={0.75}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>{t('costs.today')}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setOpen(false)}>{t('common.close')}</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <Breakdown title={t('costs.own')} cost={costs.own} />
          {costs.compare && <Breakdown title={costs.compare.name} cost={costs.compare.cost} />}
          <p className="cost-breakdown__note">{t('costs.proRataNote')}</p>
        </IonContent>
      </IonModal>
    </>
  );
}
