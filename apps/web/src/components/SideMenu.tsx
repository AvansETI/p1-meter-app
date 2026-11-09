import { IonContent, IonIcon, IonItem, IonLabel, IonList, IonMenu } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../navigation';
import BrandLogo from './BrandLogo';

/** Desktop navigation; only visible when the split pane is expanded (≥ 992 px). */
export default function SideMenu() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <IonMenu contentId="main" type="overlay" swipeGesture={false} className="app-side-menu">
      <IonContent className="ion-padding">
        <BrandLogo className="app-side-menu__logo" />
        <p className="app-side-menu__name">{t('app.shortName')}</p>
        <IonList lines="none">
          {NAV_ITEMS.map((item) => (
            <IonItem
              key={item.tab}
              routerLink={item.path}
              routerDirection="root"
              detail={false}
              className={pathname.startsWith(item.path) ? 'selected' : undefined}
            >
              <IonIcon aria-hidden="true" slot="start" icon={item.icon} />
              <IonLabel>{t(item.labelKey)}</IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonMenu>
  );
}
