import { IonButtons } from '@ionic/react';

/**
 * MNEXT logo on the right of a main page's title bar (#43). The toolbar is navy in the light
 * theme and dark grey in the dark theme, so it is always the white version. Hidden from 992 px,
 * where the side menu shows the logo.
 */
export default function ToolbarLogo() {
  return (
    <IonButtons slot="end" className="toolbar-logo">
      <img src="/brand/mnext-logo-white.svg" alt="MNEXT" />
    </IonButtons>
  );
}
