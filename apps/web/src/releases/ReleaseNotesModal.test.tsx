import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import AboutSection from '../components/AboutSection';
import { renderWithProviders } from '../test/render';
import ReleaseNotesModal from './ReleaseNotesModal';
import { RELEASES } from './releases';

describe('release notes in the app (#82)', () => {
  it('opens from About', async () => {
    renderWithProviders(<AboutSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Wat is er nieuw' }));
    expect((await screen.findAllByText(RELEASES.at(-1)!.nl)).length).toBeGreaterThan(0);
  });

  it('lists the versions newest first and marks the current one', async () => {
    renderWithProviders(<AboutSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Wat is er nieuw' }));
    await screen.findAllByText(RELEASES[0]!.nl);
    const list = latestList();
    const versions = [...list.querySelectorAll('.release-notes__item h3')].map(
      (h) => h.firstChild?.textContent,
    );
    expect(versions).toEqual(RELEASES.map((r) => r.version));
    // In tests the app version is "test": nothing is marked; a real version is.
    expect(list.querySelector('.release-notes__current')).toBeNull();
  });

  it('marks the version that is running', async () => {
    renderWithProviders(<CurrentAt version="0.12.0" />);
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    await screen.findAllByText('deze versie');
    const current = latestList().querySelector('.release-notes__current')!;
    expect(current.closest('h3')!.textContent).toContain('0.12.0');
  });

  it('follows the language of the app', async () => {
    renderWithProviders(<AboutSection />, { language: 'en' });
    fireEvent.click(await screen.findByRole('button', { name: 'Release notes' }));
    await screen.findAllByText(RELEASES[0]!.en);
    expect(latestList().textContent).toContain(RELEASES[0]!.en);
    expect(latestList().textContent).not.toContain(RELEASES[0]!.nl);
  });
});

/** The list of the modal opened last (Ionic keeps earlier, closed modals in the document). */
const latestList = () => [...document.querySelectorAll('.release-notes')].at(-1)!;

/** The modal behind a button, with a given running version. */
function CurrentAt({ version }: { version: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <ReleaseNotesModal isOpen={open} onClose={() => setOpen(false)} current={version} />
    </>
  );
}
