import { DEFAULT_PROFILE, type DeviceProfile } from './profile';

export type NormalizeResult = { ok: true; signature: string } | { ok: false };

/** Upper bound for a valid canonical signature; used to guard query building. */
export const SIGNATURE_PATTERN = /^[0-9A-Z-]{1,64}$/;

/**
 * Turns user input (dynamic part, optionally with dashes/spaces, or the full EMON ID)
 * into the canonical signature, e.g. `a1b2c3000000` → `2019-ETI-EMON-V01-A1B2C3-000000`.
 */
export function normalizeEmonId(
  input: string,
  profile: DeviceProfile = DEFAULT_PROFILE,
): NormalizeResult {
  let value = input.trim().toUpperCase();
  if (value.startsWith(profile.prefix)) value = value.slice(profile.prefix.length);
  const dynamic = value.replace(/[\s-]/g, '');
  if (!profile.dynamicPattern.test(dynamic)) return { ok: false };
  return { ok: true, signature: `${profile.prefix}-${dynamic.slice(0, 6)}-${dynamic.slice(6)}` };
}

/** The part a user recognises and types: `XXXXXX-XXXXXX`. */
export function formatDynamicPart(signature: string, profile: DeviceProfile = DEFAULT_PROFILE) {
  return signature.startsWith(`${profile.prefix}-`)
    ? signature.slice(profile.prefix.length + 1)
    : signature;
}

/**
 * Formats partial input while typing: uppercase, only hex characters, dash after six.
 * Leaves anything that is not hex out, so the field cannot hold invalid characters.
 */
export function formatEmonIdInput(input: string, profile: DeviceProfile = DEFAULT_PROFILE): string {
  let value = input.trim().toUpperCase();
  if (value.startsWith(profile.prefix)) value = value.slice(profile.prefix.length);
  const hex = value.replace(/[^0-9A-F]/g, '').slice(0, 12);
  return hex.length > 6 ? `${hex.slice(0, 6)}-${hex.slice(6)}` : hex;
}

/** Safe form for logs: keeps only the prefix and the last four characters. */
export function maskSignature(signature: string, profile: DeviceProfile = DEFAULT_PROFILE) {
  const prefix = signature.startsWith(profile.prefix) ? profile.prefix : '';
  return `${prefix}-…-${signature.slice(-4)}`;
}
