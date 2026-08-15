import React from 'react';
import {StyleSheet, View, ViewProps} from 'react-native';
import Svg, {Defs, RadialGradient, LinearGradient, Stop, Rect} from 'react-native-svg';
import {useM3Colors} from '../../theme/M3PaletteContext';
import useThemeStore from '../../lib/zustand/themeStore';

interface AmbientBackgroundProps extends ViewProps {
  children?: React.ReactNode;
}

const AmbientBackground = ({children, style, ...rest}: AmbientBackgroundProps) => {
  const colors = useM3Colors();
  const isPureBlack = useThemeStore(state => state.isPureBlack);

  if (isPureBlack) {
    return (
      <View style={[{flex: 1, backgroundColor: '#000000'}, style]} {...rest}>
        {children}
      </View>
    );
  }

  // Hardcode OpenTune mesh gradient aesthetic colors
  const color1 = '#3C306E'; // Deep purple/blue top left
  const color2 = '#5E4978'; // Soft purple/pink top right
  const color3 = '#2D305A'; // Deep navy middle left
  const color4 = '#624163'; // Warm purple middle right
  const color5 = '#242040'; // Very dark indigo bottom
  const baseColor = '#000000'; // Enforce strict AMOLED black background instead of silver/grey surface

  return (
    <View style={[{flex: 1, backgroundColor: baseColor}, style]} {...rest}>
      <View style={[StyleSheet.absoluteFill, {height: '70%'}]}>
        <Svg height="100%" width="100%">
          <Defs>
            {/* Blob 1 */}
            <RadialGradient id="grad1" cx="15%" cy="10%" r="55%">
              <Stop offset="0%" stopColor={color1} stopOpacity="0.38" />
              <Stop offset="25%" stopColor={color1} stopOpacity="0.24" />
              <Stop offset="50%" stopColor={color1} stopOpacity="0.14" />
              <Stop offset="75%" stopColor={color1} stopOpacity="0.06" />
              <Stop offset="100%" stopColor={color1} stopOpacity="0" />
            </RadialGradient>
            
            {/* Blob 2 */}
            <RadialGradient id="grad2" cx="85%" cy="20%" r="65%">
              <Stop offset="0%" stopColor={color2} stopOpacity="0.34" />
              <Stop offset="25%" stopColor={color2} stopOpacity="0.20" />
              <Stop offset="50%" stopColor={color2} stopOpacity="0.11" />
              <Stop offset="75%" stopColor={color2} stopOpacity="0.05" />
              <Stop offset="100%" stopColor={color2} stopOpacity="0" />
            </RadialGradient>

            {/* Blob 3 */}
            <RadialGradient id="grad3" cx="30%" cy="45%" r="60%">
              <Stop offset="0%" stopColor={color3} stopOpacity="0.30" />
              <Stop offset="25%" stopColor={color3} stopOpacity="0.17" />
              <Stop offset="50%" stopColor={color3} stopOpacity="0.09" />
              <Stop offset="75%" stopColor={color3} stopOpacity="0.04" />
              <Stop offset="100%" stopColor={color3} stopOpacity="0" />
            </RadialGradient>

            {/* Blob 4 */}
            <RadialGradient id="grad4" cx="70%" cy="50%" r="70%">
              <Stop offset="0%" stopColor={color4} stopOpacity="0.26" />
              <Stop offset="25%" stopColor={color4} stopOpacity="0.14" />
              <Stop offset="50%" stopColor={color4} stopOpacity="0.08" />
              <Stop offset="75%" stopColor={color4} stopOpacity="0.03" />
              <Stop offset="100%" stopColor={color4} stopOpacity="0" />
            </RadialGradient>

            {/* Blob 5 */}
            <RadialGradient id="grad5" cx="50%" cy="75%" r="80%">
              <Stop offset="0%" stopColor={color5} stopOpacity="0.22" />
              <Stop offset="25%" stopColor={color5} stopOpacity="0.12" />
              <Stop offset="50%" stopColor={color5} stopOpacity="0.06" />
              <Stop offset="75%" stopColor={color5} stopOpacity="0.02" />
              <Stop offset="100%" stopColor={color5} stopOpacity="0" />
            </RadialGradient>

            {/* Vertical Fade Overlay */}
            <LinearGradient id="grad6" x1="0%" y1="40%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={baseColor} stopOpacity="0" />
              <Stop offset="25%" stopColor={baseColor} stopOpacity="0" />
              <Stop offset="50%" stopColor={baseColor} stopOpacity="0.30" />
              <Stop offset="75%" stopColor={baseColor} stopOpacity="0.75" />
              <Stop offset="100%" stopColor={baseColor} stopOpacity="1" />
            </LinearGradient>
          </Defs>

          <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad1)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad2)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad3)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad4)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad5)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad6)" />
        </Svg>
      </View>
      {children}
    </View>
  );
};

export default AmbientBackground;
