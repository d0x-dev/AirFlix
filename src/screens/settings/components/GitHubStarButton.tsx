import {AnimatedAppText} from '../../../components/ui/Text';
import React, {useState} from 'react';
import {Linking, TouchableOpacity, View} from 'react-native';
import {AntDesign, Feather, MaterialCommunityIcons} from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {socialLinks} from '../../../lib/constants';
import {settingsStorage} from '../../../lib/storage';

const sparklePositions = [
  {top: 3, left: 18},
  {top: 11, left: 47},
  {top: 39, left: 30},
  {top: 34, left: 62},
];

interface GitHubStarButtonProps {
  primary: string;
}

const GitHubStarButton = ({primary}: GitHubStarButtonProps) => {
  const [celebrating, setCelebrating] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const openGitHub = async () => {
    if (celebrating) {
      return;
    }

    setCelebrating(true);
    scale.value = withSequence(
      withTiming(0.96, {duration: 80}),
      withSpring(1.04),
      withSpring(1),
    );

    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }

    await new Promise(resolve => setTimeout(resolve, 520));
    await Linking.openURL(socialLinks.github);
    setCelebrating(false);
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={openGitHub}>
      <Animated.View
        className="flex-row items-center justify-between p-4"
        style={animatedStyle}>
        <View className="flex-row items-center">
          <View className="relative items-center justify-center w-7 h-7">
            <AntDesign name="github" size={22} color={primary} />
            {celebrating &&
              sparklePositions.map((position, index) => (
                <Animated.View
                  key={index}
                  entering={ZoomIn.delay(index * 55).springify()}
                  exiting={FadeOut.duration(140)}
                  style={{position: 'absolute', ...position}}>
                  <MaterialCommunityIcons
                    name="star-four-points"
                    size={index % 2 === 0 ? 10 : 7}
                    color={index % 2 === 0 ? '#FFD54A' : primary}
                  />
                </Animated.View>
              ))}
          </View>
          <AnimatedAppText
            key={celebrating ? 'thanks' : 'star'}
            entering={FadeIn.duration(180)}
            className="text-white ml-3 text-base font-medium">
            {celebrating ? 'You are a star!' : 'Star Airflix on GitHub'}
          </AnimatedAppText>
        </View>
        <Feather name="external-link" size={20} color="gray" />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default GitHubStarButton;
