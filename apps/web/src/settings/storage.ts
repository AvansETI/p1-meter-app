import {
  DEFAULT_BASE_TEMPERATURE,
  DegreeDayMethodSchema,
  GasProfileSchema,
  MAX_BASE_TEMPERATURE,
  MIN_BASE_TEMPERATURE,
} from '@p1/shared';
import { z } from 'zod';

/** localStorage key; public/theme-init.js reads the theme from it before first paint. */
export const SETTINGS_KEY = 'p1meter.settings';

export const ThemeSchema = z.enum(['system', 'light', 'dark']);
export type Theme = z.infer<typeof ThemeSchema>;

/** 'system' follows the device language (docs/design/2026-11-12-language.md). */
export const LanguageSchema = z.enum(['system', 'nl', 'en']);
export type Language = z.infer<typeof LanguageSchema>;

/** Gas analysis (docs/design/2026-11-15-gas-analysis.md §7.2); only the station leaves the device. */
const GasSettingsSchema = z.object({
  /** 2-digit postcode region, to pick the nearest KNMI station. */
  postcode: z
    .string()
    .regex(/^[1-9]\d$/)
    .optional()
    .catch(undefined),
  /** Station picked by hand; wins over the postcode. */
  station: z.number().int().optional().catch(undefined),
  base: z
    .number()
    .min(MIN_BASE_TEMPERATURE)
    .max(MAX_BASE_TEMPERATURE)
    .catch(DEFAULT_BASE_TEMPERATURE),
  method: DegreeDayMethodSchema.catch('weighted'),
  /** Cooking and/or hot water on gas: a baseline is subtracted from the heating gas. */
  cooking: z.boolean().catch(true),
  /** Manual baseline in m³/day; absent means automatic. */
  baseline: z.number().min(0).max(20).optional().catch(undefined),
  profile: GasProfileSchema.catch({}),
  /** Share the profile to compare with similar households. */
  share: z.boolean().catch(false),
});
export type GasSettings = z.infer<typeof GasSettingsSchema>;

export const DEFAULT_GAS_SETTINGS: GasSettings = {
  base: DEFAULT_BASE_TEMPERATURE,
  method: 'weighted',
  cooking: true,
  profile: {},
  share: false,
};

const SettingsSchema = z.object({
  version: z.literal(1),
  emonId: z.string().optional(),
  theme: ThemeSchema.catch('system'),
  language: LanguageSchema.catch('system'),
  /** When the install banner was last dismissed (ISO); it returns after 30 days. */
  installHintDismissedAt: z.string().optional(),
  /** The user chose to never see the "fill in your tariffs" hint again. */
  tariffHintOff: z.boolean().optional(),
  /** Holiday decoration in the title bar (docs/design/2026-11-14-festive-decoration.md). */
  festive: z.boolean().catch(true),
  gas: GasSettingsSchema.catch(DEFAULT_GAS_SETTINGS),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  theme: 'system',
  language: 'system',
  festive: true,
  gas: DEFAULT_GAS_SETTINGS,
};

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
