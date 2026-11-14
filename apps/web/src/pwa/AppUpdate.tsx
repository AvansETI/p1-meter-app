import { useRegisterSW } from 'virtual:pwa-register/react';
import { startUpdateChecks, useReloadWhenIdle } from './autoUpdate';
import { UpdatedToast } from './UpdatedToast';

/** Registers the service worker and keeps the app on the newest version (#64). */
export default function AppUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, registration) => {
      if (registration) startUpdateChecks(registration);
    },
  });
  useReloadWhenIdle(needRefresh, updateServiceWorker);
  return <UpdatedToast />;
}
