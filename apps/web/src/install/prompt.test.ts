import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getInstallPromptState,
  initInstallPrompt,
  promptInstall,
  resetInstallPrompt,
} from './prompt';

function fakePromptEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  return Object.assign(event, {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome }),
  });
}

afterEach(() => {
  resetInstallPrompt();
});

describe('install prompt', () => {
  it('captures the event, suppresses the browser bar and prompts once', async () => {
    const target = new EventTarget() as Window;
    initInstallPrompt(target);
    const event = fakePromptEvent('accepted');
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(getInstallPromptState().hasPrompt).toBe(true);

    expect(await promptInstall()).toBe('accepted');
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(getInstallPromptState()).toEqual({ hasPrompt: false, installedNow: true });
    expect(await promptInstall()).toBe('unavailable');
  });

  it('stays not installed when the user dismisses the dialog', async () => {
    const target = new EventTarget() as Window;
    initInstallPrompt(target);
    target.dispatchEvent(fakePromptEvent('dismissed'));
    expect(await promptInstall()).toBe('dismissed');
    expect(getInstallPromptState()).toEqual({ hasPrompt: false, installedNow: false });
  });

  it('marks installed on appinstalled', () => {
    const target = new EventTarget() as Window;
    initInstallPrompt(target);
    target.dispatchEvent(fakePromptEvent('accepted'));
    target.dispatchEvent(new Event('appinstalled'));
    expect(getInstallPromptState()).toEqual({ hasPrompt: false, installedNow: true });
  });
});
