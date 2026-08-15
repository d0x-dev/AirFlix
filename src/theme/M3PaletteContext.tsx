import React, {createContext, useContext} from 'react';
import type {MaterialColors} from './colors';

export type M3HostTheme = {
  colorScheme: 'dark';
  seedColor?: string;
};

const fallbackPalette: MaterialColors = {
  primary: '#FFB4A8',
  onPrimary: '#561F17',
  primaryContainer: '#73342A',
  onPrimaryContainer: '#FFDAD4',
  inversePrimary: '#914B40',
  secondary: '#E7BDB6',
  onSecondary: '#442925',
  secondaryContainer: '#5D3F3A',
  onSecondaryContainer: '#FFDAD4',
  tertiary: '#DEC48C',
  onTertiary: '#3D2F05',
  tertiaryContainer: '#554519',
  onTertiaryContainer: '#FBDFA6',
  background: '#1A1110',
  onBackground: '#F1DEDA',
  surface: '#1A1110',
  onSurface: '#F1DEDA',
  surfaceVariant: '#53433F',
  onSurfaceVariant: '#D8C2BD',
  surfaceTint: '#FFB4A8',
  inverseSurface: '#F1DEDA',
  inverseOnSurface: '#382E2C',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  outline: '#A08C87',
  outlineVariant: '#53433F',
  scrim: '#000000',
  surfaceBright: '#423735',
  surfaceDim: '#1A1110',
  surfaceContainer: '#271D1B',
  surfaceContainerHigh: '#322826',
  surfaceContainerHighest: '#3D3331',
  surfaceContainerLow: '#231917',
  surfaceContainerLowest: '#140C0B',
  primaryFixed: '#FFDAD4',
  primaryFixedDim: '#FFB4A8',
  onPrimaryFixed: '#3A0905',
  onPrimaryFixedVariant: '#73342A',
  secondaryFixed: '#FFDAD4',
  secondaryFixedDim: '#E7BDB6',
  onSecondaryFixed: '#2C1511',
  onSecondaryFixedVariant: '#5D3F3A',
  tertiaryFixed: '#FBDFA6',
  tertiaryFixedDim: '#DEC48C',
  onTertiaryFixed: '#251A00',
  onTertiaryFixedVariant: '#554519',
};

export const M3PaletteContext = createContext<MaterialColors>(fallbackPalette);
export const M3HostThemeContext = createContext<M3HostTheme>({
  colorScheme: 'dark',
});

export const useM3Colors = (): MaterialColors => useContext(M3PaletteContext);
export const useM3HostTheme = (): M3HostTheme => useContext(M3HostThemeContext);
