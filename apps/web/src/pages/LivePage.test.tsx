import { IonApp } from '@ionic/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../i18n';
import LivePage from './LivePage';

describe('LivePage', () => {
  it('renders its Dutch title and placeholder', () => {
    render(
      <IonApp>
        <LivePage />
      </IonApp>,
    );
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText(/actuele verbruik en teruglevering/)).toBeInTheDocument();
  });
});
