import { afterEach, describe, expect, it } from 'vitest';
import { isBusy } from './busy';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('isBusy', () => {
  it('is not busy on a plain page', () => {
    document.body.innerHTML = '<main><button>ok</button></main>';
    document.querySelector('button')!.focus();
    expect(isBusy()).toBe(false);
  });

  it.each(['ion-modal', 'ion-alert', 'ion-action-sheet', 'ion-popover', 'ion-picker'])(
    'is busy while an %s is open',
    (tag) => {
      document.body.innerHTML = `<${tag}></${tag}>`;
      expect(isBusy()).toBe(true);
    },
  );

  it('ignores closed inline overlays', () => {
    document.body.innerHTML = '<ion-modal class="overlay-hidden"></ion-modal>';
    expect(isBusy()).toBe(false);
  });

  it('is busy while a text field has focus', () => {
    document.body.innerHTML = '<ion-input><input /></ion-input>';
    document.querySelector('input')!.focus();
    expect(isBusy()).toBe(true);
    document.querySelector('input')!.blur();
    expect(isBusy()).toBe(false);
  });
});
