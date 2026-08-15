import {AnimatedAppText} from '../../components/ui/Text';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {Pressable, View, StatusBar, Platform} from 'react-native';
import type {SettingsStackParamList} from '../../App';
import AppearancePreference from './components/AppearancePreference';
import AppText from '../../components/ui/Text';
import {useM3Colors} from '../../theme/M3PaletteContext';
import AmbientBackground from '../../components/ui/AmbientBackground';
import Animated, {
  FadeInUp,
  Layout,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  interpolateColor,
} from 'react-native-reanimated';
import {Ionicons} from '@expo/vector-icons';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Appearance'>;

const Appearance = ({navigation}: Props) => {
  const colors = useM3Colors();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerTextStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollY.value, [30, 60], [10, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const headerContainerStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        scrollY.value,
        [30, 60],
        ['transparent', '#000000']
      ),
    };
  });

  return (
    <AmbientBackground>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        
        {/* Sticky Top Header Bar */}
        <Animated.View 
          style={[{ 
            position: 'absolute', top: 0, left: 0, right: 0, 
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 20, 
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 5 : 45,
            paddingBottom: 15,
            zIndex: 10,
          }, headerContainerStyle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => navigation.goBack()} style={({pressed}) => ({ opacity: pressed ? 0.7 : 1, padding: 4, marginLeft: -4 })}>
              <Ionicons name="arrow-back" size={28} color="#ffffff" />
            </Pressable>
            <AnimatedAppText style={[{ color: '#ffffff', fontSize: 20, marginLeft: 20 }, headerTextStyle]}>
              Appearance
            </AnimatedAppText>
          </View>
        </Animated.View>

        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          className="h-full w-full"
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
          entering={FadeInUp.springify()}
          layout={Layout.springify()}
          contentContainerStyle={{
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 85 : 120, // Push content down below the sticky bar
            paddingBottom: 120,
            flexGrow: 1,
          }}>
          
          {/* Large Scrolling Header */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24, marginTop: 10 }}>
            <AppText role="headlineLarge" style={{ color: '#ffffff', fontSize: 34 }}>
              Appearance
            </AppText>
          </View>

          <View className="px-5">
            <AppearancePreference />
          </View>
        </Animated.ScrollView>
      </View>
    </AmbientBackground>
  );
};

export default Appearance;

