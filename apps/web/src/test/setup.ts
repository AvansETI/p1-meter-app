import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

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
