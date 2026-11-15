/**
 * The version the API reports on each response (`x-app-version`). A different version means a
 * new deployment, so the app looks for the new service worker right away instead of waiting
 * for the next foreground or hourly check (#64).
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function reportServerVersion(version: string | null, own: string = __APP_VERSION__) {
  if (version && version !== own) for (const listener of listeners) listener();
}

export function onNewServerVersion(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
