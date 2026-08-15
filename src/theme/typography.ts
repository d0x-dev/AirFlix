import type {TextStyle} from 'react-native';

type TypographyToken = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'fontWeight' | 'letterSpacing' | 'lineHeight'
>;

const brand = (
  fontSize: number,
  lineHeight: number,
  emphasized = false,
): TypographyToken => ({
  fontFamily: emphasized ? 'Inter_500Medium' : 'Inter_400Regular',
  fontSize,
  lineHeight,
  letterSpacing: 0,
  fontWeight: emphasized ? '500' : '400',
});

const plain = (
  fontSize: number,
  lineHeight: number,
  letterSpacing: number,
  fontWeight: TypographyToken['fontWeight'] = '400',
): TypographyToken => ({
  fontFamily:
    fontWeight === '700'
      ? 'Inter_700Bold'
      : fontWeight === '500'
        ? 'Inter_500Medium'
        : 'Inter_400Regular',
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight,
});

export const M3_TYPE = {
  displayLarge: brand(57, 64),
  displayMedium: brand(45, 52),
  displaySmall: brand(36, 44),
  headlineLarge: brand(32, 40),
  headlineMedium: brand(28, 36),
  headlineSmall: brand(24, 32),
  titleLarge: brand(22, 28),
  titleMedium: plain(16, 24, 0.2, '500'),
  titleSmall: plain(14, 20, 0.1, '500'),
  bodyLarge: plain(16, 24, 0.5),
  bodyMedium: plain(14, 20, 0.2),
  bodySmall: plain(12, 16, 0.4),
  labelLarge: plain(14, 20, 0.1, '500'),
  labelMedium: plain(12, 16, 0.5, '500'),
  labelSmall: plain(11, 16, 0.5, '500'),
  displayLargeEmphasized: brand(57, 64, true),
  displayMediumEmphasized: brand(45, 52, true),
  displaySmallEmphasized: brand(36, 44, true),
  headlineLargeEmphasized: brand(32, 40, true),
  headlineMediumEmphasized: brand(28, 36, true),
  headlineSmallEmphasized: brand(24, 32, true),
  titleLargeEmphasized: brand(22, 28, true),
  titleMediumEmphasized: plain(16, 24, 0.15, '700'),
  titleSmallEmphasized: plain(14, 20, 0.1, '700'),
  bodyLargeEmphasized: plain(16, 24, 0.15, '500'),
  bodyMediumEmphasized: plain(14, 20, 0.25, '500'),
  bodySmallEmphasized: plain(12, 16, 0.4, '500'),
  labelLargeEmphasized: plain(14, 20, 0.1, '700'),
  labelMediumEmphasized: plain(12, 16, 0.5, '700'),
  labelSmallEmphasized: plain(11, 16, 0.5, '700'),
} as const satisfies Record<string, TypographyToken>;

export type M3TypeRole = keyof typeof M3_TYPE;
