import { afterEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/render';
import { UPDATED_FROM_KEY } from './autoUpdate';
import { UpdatedToast } from './UpdatedToast';

afterEach(() => {
  sessionStorage.clear();
});

// jsdom does not render the toast's shadow DOM; check the properties Ionic React sets.
const toast = (container: HTMLElement) =>
  container.ownerDocument.querySelector('ion-toast') as HTMLElement & {
    isOpen: boolean;
    message: string;
  };

describe('UpdatedToast', () => {
  it('says once that the app was updated', () => {
    sessionStorage.setItem(UPDATED_FROM_KEY, '0.9.0');
    const { container } = renderWithProviders(<UpdatedToast version="0.10.0" />);
    expect(toast(container).isOpen).toBe(true);
    expect(toast(container).message).toBe('Bijgewerkt naar versie 0.10.0');
    expect(sessionStorage.getItem(UPDATED_FROM_KEY)).toBeNull();
  });

  it('stays silent on a normal start', () => {
    const { container } = renderWithProviders(<UpdatedToast version="0.10.0" />);
    expect(toast(container).isOpen).toBe(false);
  });

  it('stays silent when the version did not change', () => {
    sessionStorage.setItem(UPDATED_FROM_KEY, '0.10.0');
    const { container } = renderWithProviders(<UpdatedToast version="0.10.0" />);
    expect(toast(container).isOpen).toBe(false);
  });
});
