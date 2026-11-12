import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useSettings } from './context';
import { SettingsProvider } from './SettingsProvider';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './storage';

afterEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('nl');
});

function LanguageProbe() {
  const { t } = useTranslation();
  const { setLanguage } = useSettings();
  return (
    <>
      <p>{t('settings.title')}</p>
      <button onClick={() => setLanguage('en')}>en</button>
      <button onClick={() => setLanguage('system')}>system</button>
    </>
  );
}

describe('SettingsProvider language', () => {
  it('switches the texts and <html lang> without a reload, and stores the choice', async () => {
    render(
      <SettingsProvider initial={DEFAULT_SETTINGS}>
        <LanguageProbe />
      </SettingsProvider>,
    );
    expect(screen.getByText('Instellingen')).toBeInTheDocument();

    act(() => screen.getByText('en').click());
    expect(await screen.findByText('Settings')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toMatchObject({ language: 'en' });

    // "System" follows the (Dutch) device language again.
    act(() => screen.getByText('system').click());
    await waitFor(() => expect(screen.getByText('Instellingen')).toBeInTheDocument());
    expect(document.documentElement.lang).toBe('nl');
  });
});
