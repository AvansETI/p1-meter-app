import { z } from 'zod';

/** localStorage key; public/theme-init.js reads the theme from it before first paint. */
export const SETTINGS_KEY = 'p1meter.settings';

export const ThemeSchema = z.enum(['system', 'light', 'dark']);
export type Theme = z.infer<typeof ThemeSchema>;

const SettingsSchema = z.object({
  version: z.literal(1),
  emonId: z.string().optional(),
  theme: ThemeSchema.catch('system'),
  /** When the install banner was last dismissed (ISO); it returns after 30 days. */
  installHintDismissedAt: z.string().optional(),
  /** The user chose to never see the "fill in your tariffs" hint again. */
  tariffHintOff: z.boolean().optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = { version: 1, theme: 'system' };

/** Reads settings; falls back to defaults when storage is unavailable or the data is invalid. */
export function loadSettings(storage: Storage | undefined = globalThis.localStorage): Settings {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = SettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Persists settings; without storage (private mode, blocked) they last for this visit only. */
export function saveSettings(
  settings: Settings,
  storage: Storage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore: the in-memory state still works.
  }
}
