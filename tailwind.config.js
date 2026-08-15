/** @type {import('tailwindcss').Config} */

// Material 3 color roles, published as CSS variables at runtime by
// `src/theme/M3ThemeProvider.tsx`. Kept in sync with `src/theme/colors.ts`.
const M3_COLOR_ROLES = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'inversePrimary',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'background',
  'onBackground',
  'surface',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'surfaceTint',
  'inverseSurface',
  'inverseOnSurface',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'outline',
  'outlineVariant',
  'scrim',
  'surfaceBright',
  'surfaceDim',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'surfaceContainerLow',
  'surfaceContainerLowest',
  'primaryFixed',
  'primaryFixedDim',
  'onPrimaryFixed',
  'onPrimaryFixedVariant',
  'secondaryFixed',
  'secondaryFixedDim',
  'onSecondaryFixed',
  'onSecondaryFixedVariant',
  'tertiaryFixed',
  'tertiaryFixedDim',
  'onTertiaryFixed',
  'onTertiaryFixedVariant',
];

const kebab = role =>
  role.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

// `bg-m3-surface`, `text-m3-on-surface`, `border-m3-outline-variant`, ...
const m3Colors = Object.fromEntries(
  M3_COLOR_ROLES.map(role => [kebab(role), `var(--m3-${kebab(role)})`]),
);

module.exports = {
  content: ['./src/**/*.{html,js,jsx,ts,tsx}', '!./src/lib/services/builtinAirflix.ts'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        m3: m3Colors,
        // Legacy palette, retained until every screen is migrated to `m3-*`.
        primary: '#FF6347',
        secondary: '#000000',
        tertiary: '#171717',
        quaternary: '#1a1a1a',
      },
    },
  },
  plugins: [],
};
