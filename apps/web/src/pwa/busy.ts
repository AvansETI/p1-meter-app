/** Ionic overlays; a closed inline overlay stays in the DOM with `overlay-hidden`. */
const OPEN_OVERLAY = [
  'ion-modal',
  'ion-alert',
  'ion-action-sheet',
  'ion-popover',
  'ion-picker',
  'ion-loading',
]
  .map((tag) => `${tag}:not(.overlay-hidden)`)
  .join(', ');

const TEXT_FIELD =
  'input, textarea, select, ion-input, ion-textarea, ion-searchbar, [contenteditable]';

/**
 * Whether the user is in the middle of something an automatic reload would interrupt (#64):
 * an open overlay (all editing happens in one) or a focused text field.
 */
export function isBusy(doc: Document = document): boolean {
  if (doc.querySelector(OPEN_OVERLAY)) return true;
  const active = doc.activeElement;
  return active instanceof Element && active.closest(TEXT_FIELD) !== null;
}
