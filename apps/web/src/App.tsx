import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonSplitPane,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useTranslation } from 'react-i18next';
import { Navigate, Route } from 'react-router-dom';
import SideMenu from './components/SideMenu';
import { NAV_ITEMS } from './navigation';
import HistoryPage from './pages/HistoryPage';
import LivePage from './pages/LivePage';
import SettingsPage from './pages/SettingsPage';
import UpdatePrompt from './pwa/UpdatePrompt';

export default function App() {
  const { t } = useTranslation();

  return (
    <IonApp>
      <IonReactRouter>
        {/* One route tree for both layouts: side menu from "lg" (992 px), tab bar below. */}
        <IonSplitPane contentId="main" when="lg">
          <SideMenu />
          <div className="ion-page" id="main">
            <IonTabs>
              <IonRouterOutlet>
                <Route path="/live" element={<LivePage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/" element={<Navigate to="/live" replace />} />
                <Route path="*" element={<Navigate to="/live" replace />} />
              </IonRouterOutlet>
              <IonTabBar slot="bottom" className="app-tab-bar">
                {NAV_ITEMS.map((item) => (
                  <IonTabButton key={item.tab} tab={item.tab} href={item.path}>
                    <IonIcon aria-hidden="true" icon={item.icon} />
                    <IonLabel>{t(item.labelKey)}</IonLabel>
                  </IonTabButton>
                ))}
              </IonTabBar>
            </IonTabs>
          </div>
        </IonSplitPane>
      </IonReactRouter>
      <UpdatePrompt />
    </IonApp>
  );
}
