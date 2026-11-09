import type { LiveSnapshot } from '@p1/shared';
import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeEventSource, installFakeEventSource } from '../test/eventsource';
import { SIGNATURE, capabilities, sessionResponse } from '../test/fixtures';
import { mockApi, renderWithProviders } from '../test/render';
import LivePage from './LivePage';

vi.mock('../live/RecentChart', () => ({
  default: () => <div data-testid="recent-chart" />,
}));

const snapshot = (overrides: Partial<LiveSnapshot> = {}): LiveSnapshot => ({
  time: new Date().toISOString(),
  ageSec: 2,
  status: 'live',
  importKw: 3.52,
  exportKw: 0,
  netKw: 3.52,
  ...overrides,
});

function setup(options: { hasExport: boolean; hasGas?: boolean }) {
  const caps = { hasExport: options.hasExport, hasGas: options.hasGas ?? true };
  mockApi({
    '/api/v1/session': { status: 200, body: sessionResponse(caps) },
    '/api/v1/capabilities': { status: 200, body: capabilities(caps) },
    '/api/v1/live/today': {
      status: 200,
      body: {
        since: '2026-11-08T23:00:00.000Z',
        importKwh: 12.4,
        ...(options.hasExport && { exportKwh: 3.1, netKwh: 9.3 }),
        ...(caps.hasGas && { gasM3: 0.68 }),
      },
    },
    '/api/v1/live/recent': { status: 200, body: { stepSec: 300, points: [] } },
  });
  renderWithProviders(<LivePage />, { emonId: SIGNATURE });
}

async function stream(): Promise<FakeEventSource> {
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
  return FakeEventSource.instances[0]!;
}

beforeEach(() => {
  installFakeEventSource();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('LivePage', () => {
  it('shows net import with the live status', async () => {
    setup({ hasExport: true });
    const source = await stream();
    expect(source.url).toBe('/api/v1/live/stream?session=test-session');
    act(() => source.emit('live', snapshot()));
    expect(await screen.findByText('Van het net')).toBeInTheDocument();
    expect(screen.getByText(/^3,52/)).toBeInTheDocument();
    expect(screen.getByText(/^live · /)).toBeInTheDocument();
  });

  it('shows power below 1 kW in watts', async () => {
    setup({ hasExport: true });
    const source = await stream();
    act(() => source.emit('live', snapshot({ importKw: 0, exportKw: 0.93, netKw: -0.93 })));
    expect(await screen.findByText('Terug aan het net')).toBeInTheDocument();
    expect(screen.getByText(/^930/)).toBeInTheDocument();
    expect(screen.getByText('W')).toBeInTheDocument();
  });

  it('shows net export as "terug aan het net"', async () => {
    setup({ hasExport: true });
    const source = await stream();
    act(() => source.emit('live', snapshot({ importKw: 0.1, exportKw: 1.3, netKw: -1.2 })));
    expect(await screen.findByText('Terug aan het net')).toBeInTheDocument();
    expect(screen.getByText(/^1,20/)).toBeInTheDocument();
  });

  it('shows import, export, net and gas for today', async () => {
    setup({ hasExport: true });
    expect(await screen.findByText('Netto')).toBeInTheDocument();
    for (const label of ['Afname', 'Terug', 'Gas']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText(/^9,3/)).toBeInTheDocument();
  });

  it('leaves out everything about export and gas when the household has none', async () => {
    setup({ hasExport: false, hasGas: false });
    expect(await screen.findByText('Afname')).toBeInTheDocument();
    expect(screen.queryByText('Terug')).toBeNull();
    expect(screen.queryByText('Netto')).toBeNull();
    expect(screen.queryByText('Gas')).toBeNull();
  });

  it('shows the offline notice when the last point is older than an hour', async () => {
    setup({ hasExport: false });
    const source = await stream();
    act(() =>
      source.emit(
        'live',
        snapshot({ time: '2026-10-14T15:38:29Z', ageSec: 26 * 24 * 3600, status: 'offline' }),
      ),
    );
    expect(await screen.findByText(/Je meter stuurt sinds 14 okt/)).toBeInTheDocument();
    expect(screen.queryByText('Van het net')).toBeNull();
  });
});
