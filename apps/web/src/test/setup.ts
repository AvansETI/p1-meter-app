import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// <ion-app> starts its focus and keyboard helpers in a 32 ms timer after it loads. In a short
// test file that timer could fire after jsdom was torn down ("window is not defined").
afterAll(() => new Promise((resolve) => setTimeout(resolve, 100)));

// jsdom has no matchMedia; Ionic and the splash logic query it. (Skipped in node-environment tests.)
if (typeof window !== 'undefined')
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

// jsdom has no ResizeObserver; charts use it to follow their container size.
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true, // tests may stub it themselves
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
}
