import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '../i18n';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsProvider } from '../settings/SettingsProvider';
import { useSettings } from '../settings/context';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../settings/storage';
import FestiveDecoration, { Decoration } from './FestiveDecoration';
import { SEASONS } from './season';

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) => ({ matches, media: query, addEventListener: vi.fn() }) as unknown as MediaQueryList,
  );
}

function renderAt(date: Date, festive = true) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(date);
  return render(
    <SettingsProvider initial={{ ...DEFAULT_SETTINGS, festive }}>
      <FestiveDecoration />
    </SettingsProvider>,
  );
}

describe('Decoration', () => {
  it('shows lights and baubles at Christmas', () => {
    const { container } = render(<Decoration season="christmas" />);
    expect(container.querySelector('.festive')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.festive__bulb').length).toBeGreaterThan(40);
    expect(container.querySelectorAll('.festive__bauble')).toHaveLength(3);
  });

  it('shows fireworks around New Year', () => {
    // jsdom has no canvas; the fireworks then simply do not start.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { container } = render(<Decoration season="newyear" />);
    expect(container.querySelector('canvas.festive__fireworks')).toBeInTheDocument();
  });

  it('shows no fireworks with reduced motion', () => {
    setReducedMotion(true);
    const { container } = render(<Decoration season="newyear" />);
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });
});

/** Full pictures of their own (docs/design/2026-11-15-fuller-festive-scenes.md §2). */
const FULL_PICTURES = ['christmas', 'newyear', 'hanukkah', 'advent'];
const WIDE_LAYERS = [
  '.festive__falling',
  '.festive__traveller',
  '.festive__walker',
  '.festive__bunting',
  '.festive__edge',
].join(', ');

describe('Decoration: every scene is well filled (#75)', () => {
  it.each(SEASONS.filter((season) => !FULL_PICTURES.includes(season)))('fills %s', (season) => {
    const { container } = render(<Decoration season={season} />);
    const layer = container.querySelector(`.festive--${season}`)!;
    expect(
      layer.querySelectorAll('.festive__figures > .festive__fig').length,
    ).toBeGreaterThanOrEqual(4);
    expect(layer.querySelector(WIDE_LAYERS)).not.toBeNull();
  });

  it('opens the description from anywhere on the title bar', async () => {
    const { container } = render(<Decoration season="movember" />);
    // One button over the whole bar, above the decoration, not tied to a figure.
    const css = readFileSync(path.join(__dirname, 'festive.css'), 'utf8');
    const rule = (selector: string) =>
      new RegExp(`\\n${selector.replace('.', '\\.')} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
    expect(rule('.festive__info')).toMatch(/inset: env\(safe-area-inset-top, 0px\) 0 0 0;/);
    const z = (selector: string) => Number(/z-index: (\d+)/.exec(rule(selector))?.[1]);
    expect(z('.festive__info')).toBeGreaterThan(z('.festive'));
    const button = container.querySelector('.festive__info')!;
    expect(button.closest('.festive')).toBeNull();
    fireEvent.click(button);
    expect(await screen.findByText(/een snor staan/)).toBeInTheDocument();
  });
});

describe('Decoration: every season', () => {
  it.each(SEASONS.filter((season) => season !== 'newyear'))('draws %s', (season) => {
    const { container } = render(<Decoration season={season} />);
    const layer = container.querySelector(`.festive--${season}`);
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer!.childElementCount).toBeGreaterThan(0);
  });

  it('lights the shamash and one more candle each evening of Chanoeka', () => {
    const flames = (now: Date) =>
      render(<Decoration season="hanukkah" now={now} />).container.querySelectorAll('.fx-flame')
        .length;
    expect(flames(new Date(2026, 11, 4))).toBe(2);
    expect(flames(new Date(2026, 11, 8))).toBe(6);
    expect(flames(new Date(2026, 11, 12))).toBe(9);
  });

  it('tells what the holiday is about on tap', async () => {
    render(<Decoration season="stmartin" />);
    fireEvent.click(screen.getByRole('button', { name: 'Over deze feestdag: Sint-Maarten' }));
    expect(await screen.findByText(/zelfgemaakte lampionnen/)).toBeInTheDocument();
  });
});

describe('FestiveDecoration', () => {
  it('follows the date', () => {
    expect(
      renderAt(new Date(2026, 11, 24)).container.querySelector('.festive--christmas'),
    ).toBeInTheDocument();
  });

  it('shows the time of year on a day without a holiday', () => {
    expect(
      renderAt(new Date(2027, 4, 28)).container.querySelector('.festive--spring'),
    ).toBeInTheDocument();
  });

  it('shows nothing when switched off', () => {
    expect(renderAt(new Date(2026, 11, 24), false).container).toBeEmptyDOMElement();
  });

  it('disappears when the setting is switched off, and stores it', () => {
    function Off() {
      const { setFestive } = useSettings();
      return <button onClick={() => setFestive(false)}>off</button>;
    }
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 24));
    const { container } = render(
      <SettingsProvider initial={DEFAULT_SETTINGS}>
        <FestiveDecoration />
        <Off />
      </SettingsProvider>,
    );
    expect(container.querySelector('.festive')).toBeInTheDocument();
    act(() => screen.getByText('off').click());
    expect(container.querySelector('.festive')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')).toMatchObject({
      festive: false,
    });
  });
});
