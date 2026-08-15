import type {TextStyle} from 'react-native';

type TypographyToken = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'fontWeight' | 'letterSpacing' | 'lineHeight'
>;

const brand = (
  fontSize: number,
  lineHeight: number,
  emphasized = false,
  useLinoteeFont = false,
): TypographyToken => ({
  fontFamily: useLinoteeFont
    ? 'Linotee'
    : emphasized
      ? 'Inter_500Medium'
      : 'Inter_400Regular',
  fontSize,
  lineHeight,
  letterSpacing: 0,
  fontWeight: useLinoteeFont ? undefined : (emphasized ? '500' : '400'),
});

const plain = (
  fontSize: number,
  lineHeight: number,
  letterSpacing: number,
  fontWeight: TypographyToken['fontWeight'] = '400',
  useLinoteeFont = false,
): TypographyToken => ({
  fontFamily: useLinoteeFont
    ? 'Linotee'
    : fontWeight === '700'
      ? 'Inter_700Bold'
      : fontWeight === '500'
        ? 'Inter_500Medium'
        : 'Inter_400Regular',
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight: useLinoteeFont ? undefined : fontWeight,
});

export const getM3Type = (useLinoteeFont: boolean) =>
  ({
    displayLarge: brand(57, 64, false, useLinoteeFont),
    displayMedium: brand(45, 52, false, useLinoteeFont),
    displaySmall: brand(36, 44, false, useLinoteeFont),
    headlineLarge: brand(32, 40, false, useLinoteeFont),
    headlineMedium: brand(28, 36, false, useLinoteeFont),
    headlineSmall: brand(24, 32, false, useLinoteeFont),
    titleLarge: brand(22, 28, false, useLinoteeFont),
    titleMedium: plain(16, 24, 0.2, '500', useLinoteeFont),
    titleSmall: plain(14, 20, 0.1, '500', useLinoteeFont),
    bodyLarge: plain(16, 24, 0.5, '400', useLinoteeFont),
    bodyMedium: plain(14, 20, 0.2, '400', useLinoteeFont),
    bodySmall: plain(12, 16, 0.4, '400', useLinoteeFont),
    labelLarge: plain(14, 20, 0.1, '500', useLinoteeFont),
    labelMedium: plain(12, 16, 0.5, '500', useLinoteeFont),
    labelSmall: plain(11, 16, 0.5, '500', useLinoteeFont),
    displayLargeEmphasized: brand(57, 64, true, useLinoteeFont),
    displayMediumEmphasized: brand(45, 52, true, useLinoteeFont),
    displaySmallEmphasized: brand(36, 44, true, useLinoteeFont),
    headlineLargeEmphasized: brand(32, 40, true, useLinoteeFont),
    headlineMediumEmphasized: brand(28, 36, true, useLinoteeFont),
    headlineSmallEmphasized: brand(24, 32, true, useLinoteeFont),
    titleLargeEmphasized: brand(22, 28, true, useLinoteeFont),
    titleMediumEmphasized: plain(16, 24, 0.15, '700', useLinoteeFont),
    titleSmallEmphasized: plain(14, 20, 0.1, '700', useLinoteeFont),
    bodyLargeEmphasized: plain(16, 24, 0.15, '500', useLinoteeFont),
    bodyMediumEmphasized: plain(14, 20, 0.25, '500', useLinoteeFont),
    bodySmallEmphasized: plain(12, 16, 0.4, '500', useLinoteeFont),
    labelLargeEmphasized: plain(14, 20, 0.1, '700', useLinoteeFont),
    labelMediumEmphasized: plain(12, 16, 0.5, '700', useLinoteeFont),
    labelSmallEmphasized: plain(11, 16, 0.5, '700', useLinoteeFont),
  }) as const satisfies Record<string, TypographyToken>;

// Keep a default static export for types and non-reactive usages if any
export const M3_TYPE = getM3Type(false);

export type M3TypeRole = keyof typeof M3_TYPE;
