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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Navigate, Route } from 'react-router-dom';
import SideMenu from './components/SideMenu';
import { NAV_ITEMS } from './navigation';
import HistoryPage from './pages/HistoryPage';
import LivePage from './pages/LivePage';
import SettingsPage from './pages/SettingsPage';
import WelcomePage from './pages/WelcomePage';
import UpdatePrompt from './pwa/UpdatePrompt';
import { SessionProvider } from './session/SessionProvider';
import { useSettings } from './settings/context';
import { SettingsProvider } from './settings/SettingsProvider';
import { useThemeClass } from './theme/theme';

/** Tabs on mobile, side menu from "lg" (992 px); one route tree for both layouts. */
function MainLayout() {
  const { t } = useTranslation();
  return (
    <IonSplitPane contentId="main" when="lg">
      <SideMenu />
      <div className="ion-page" id="main">
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/live" element={<LivePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
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
  );
}

/** Without a stored EMON ID only the welcome screen is reachable. */
function WelcomeLayout() {
  return (
    <IonRouterOutlet>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </IonRouterOutlet>
  );
}

function Shell() {
  const { settings } = useSettings();
  useThemeClass(settings.theme);
  return (
    <IonApp>
      <IonReactRouter>{settings.emonId ? <MainLayout /> : <WelcomeLayout />}</IonReactRouter>
      <UpdatePrompt />
    </IonApp>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <SessionProvider>
          <Shell />
        </SessionProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}
