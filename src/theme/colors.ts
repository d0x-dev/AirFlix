import type {MaterialColors} from '@expo/ui/jetpack-compose';

/**
 * Every Material 3 color role exposed by `@expo/ui`. Kept as a runtime array so
 * the palette can be turned into CSS variables without hand-maintaining a
 * second list.
 */
export const M3_COLOR_ROLES = [
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
] as const satisfies readonly (keyof MaterialColors)[];

export type M3ColorRole = (typeof M3_COLOR_ROLES)[number];

/** kebab-cases a role name into its CSS variable, e.g. `onPrimaryContainer` -> `--m3-on-primary-container`. */
export const roleToCssVar = (role: M3ColorRole): `--${string}` =>
  `--m3-${role.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;

export type {MaterialColors};
