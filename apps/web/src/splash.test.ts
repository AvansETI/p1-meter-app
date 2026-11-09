import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hideSplash } from './splash';

describe('hideSplash', () => {
  let el: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    el = document.createElement('div');
    el.id = 'splash';
    document.body.append(el);
  });

  afterEach(() => {
    vi.useRealTimers();
    el.remove();
  });

  it('keeps the splash until the minimum duration has passed', async () => {
    const done = hideSplash(el, { minMs: 1200, now: () => 500, reducedMotion: () => true });
    await vi.advanceTimersByTimeAsync(699);
    expect(el.isConnected).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(el.isConnected).toBe(false);
  });

  it('adds no delay when loading took longer than the minimum', async () => {
    const done = hideSplash(el, { minMs: 1200, now: () => 3000, reducedMotion: () => true });
    await vi.advanceTimersByTimeAsync(0);
    await done;
    expect(el.isConnected).toBe(false);
  });

  it('fades out before removing when motion is allowed', async () => {
    const done = hideSplash(el, { minMs: 0, now: () => 0, reducedMotion: () => false });
    await vi.advanceTimersByTimeAsync(0);
    expect(el.classList.contains('splash--hide')).toBe(true);
    expect(el.isConnected).toBe(true);
    el.dispatchEvent(new Event('transitionend'));
    await done;
    expect(el.isConnected).toBe(false);
  });

  it('resolves immediately without a splash element', async () => {
    await expect(hideSplash(null)).resolves.toBeUndefined();
  });
});
