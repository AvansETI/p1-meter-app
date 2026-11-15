import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UPDATED_FROM_KEY, startUpdateChecks, useReloadWhenIdle } from './autoUpdate';
import { reportServerVersion } from './serverVersion';

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setHidden(false);
  document.body.innerHTML = '';
  sessionStorage.clear();
  delete document.documentElement.dataset.splash;
});

describe('startUpdateChecks', () => {
  it('checks when the app returns to the foreground and every hour', () => {
    const update = vi.fn(() => Promise.resolve());
    const stop = startUpdateChecks({ update });

    vi.advanceTimersByTime(2 * 60_000);
    setHidden(true);
    setHidden(false);
    expect(update).toHaveBeenCalledTimes(1);

    // Switching back and forth within a minute does not check again.
    setHidden(true);
    setHidden(false);
    expect(update).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60 * 60_000);
    expect(update).toHaveBeenCalledTimes(2);
    stop();
  });

  it('checks when the API reports another version, at most once per minute', () => {
    const update = vi.fn(() => Promise.resolve());
    const stop = startUpdateChecks({ update });
    vi.advanceTimersByTime(2 * 60_000);

    reportServerVersion('test');
    reportServerVersion(null);
    expect(update).not.toHaveBeenCalled();

    reportServerVersion('9.9.9');
    reportServerVersion('9.9.9');
    expect(update).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    reportServerVersion('9.9.9');
    expect(update).toHaveBeenCalledTimes(2);

    stop();
    vi.advanceTimersByTime(60_000);
    reportServerVersion('9.9.9');
    expect(update).toHaveBeenCalledTimes(2);
  });

  describe('says "Bijwerken…" on the splash as soon as an update is found', () => {
    // jsdom has no service worker container.
    const withController = (controller: object | null) =>
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { controller },
      });
    afterEach(() => {
      delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    });

    it('when the update is found later', () => {
      document.body.innerHTML = '<div id="splash"></div>';
      withController({});
      const target = new EventTarget();
      const stop = startUpdateChecks({
        update: () => Promise.resolve(),
        addEventListener: (type, listener) => target.addEventListener(type, listener),
      });
      expect(document.documentElement.dataset.splash).toBeUndefined();
      target.dispatchEvent(new Event('updatefound'));
      expect(document.documentElement.dataset.splash).toBe('updating');
      stop();
    });

    it('when the browser is already installing it at start-up', () => {
      document.body.innerHTML = '<div id="splash"></div>';
      withController({});
      const stop = startUpdateChecks({ update: () => Promise.resolve(), installing: {} });
      expect(document.documentElement.dataset.splash).toBe('updating');
      stop();
    });

    it('not on the first visit, nor after the splash is gone', () => {
      document.body.innerHTML = '<div id="splash"></div>';
      withController(null);
      startUpdateChecks({
        update: () => Promise.resolve(),
        installing: {},
      })();
      expect(document.documentElement.dataset.splash).toBeUndefined();
      document.body.innerHTML = '';
      withController({});
      startUpdateChecks({
        update: () => Promise.resolve(),
        installing: {},
      })();
      expect(document.documentElement.dataset.splash).toBeUndefined();
    });
  });

  it('does not check while hidden', () => {
    const update = vi.fn(() => Promise.resolve());
    const stop = startUpdateChecks({ update });
    setHidden(true);
    vi.advanceTimersByTime(60 * 60_000);
    expect(update).not.toHaveBeenCalled();
    stop();
  });
});

describe('useReloadWhenIdle', () => {
  it('does nothing without a new version', () => {
    const update = vi.fn(() => Promise.resolve());
    renderHook(() => useReloadWhenIdle(false, update, '0.9.0'));
    vi.advanceTimersByTime(60_000);
    expect(update).not.toHaveBeenCalled();
  });

  it('reloads right away when the user is not busy, and remembers the old version', () => {
    document.body.innerHTML = '<div id="splash"></div>';
    const update = vi.fn(() => Promise.resolve());
    renderHook(() => useReloadWhenIdle(true, update, '0.9.0'));
    expect(update).toHaveBeenCalledWith(true);
    expect(sessionStorage.getItem(UPDATED_FROM_KEY)).toBe('0.9.0');
    expect(document.documentElement.dataset.splash).toBe('updating');
  });

  it('waits while a modal is open and reloads once it is closed', () => {
    document.body.innerHTML = '<ion-modal></ion-modal>';
    const update = vi.fn(() => Promise.resolve());
    renderHook(() => useReloadWhenIdle(true, update, '0.9.0'));
    vi.advanceTimersByTime(30_000);
    expect(update).not.toHaveBeenCalled();

    document.querySelector('ion-modal')!.classList.add('overlay-hidden');
    vi.advanceTimersByTime(5_000);
    expect(update).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_000);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
