import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Icons on a white background with padding, per docs/design/2026-11-09-visual-design.md §5.2.
const white = { background: 'white', fit: 'contain' } as const;

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0.15, resizeOptions: white },
    maskable: { ...minimal2023Preset.maskable, padding: 0.2, resizeOptions: white },
    apple: { ...minimal2023Preset.apple, padding: 0.2, resizeOptions: white },
  },
  images: ['public/brand/mnext-logo.svg'],
});
