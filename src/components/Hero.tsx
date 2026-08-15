import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Image, Keyboard, Pressable, View} from 'react-native';
import {getColors} from 'react-native-image-colors';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {HomeStackParamList} from '../App';
import {useHeroMetadata} from '../lib/hooks/useHomePageData';
import useContentStore from '../lib/zustand/contentStore';
import useHeroStore from '../lib/zustand/herostore';
import {useM3Colors} from '../theme/M3PaletteContext';
import {mixHex} from '../theme/seeds';
import Button from './ui/Button';
import SearchField, {type SearchFieldRef} from './ui/SearchField';
import AppText from './ui/Text';

interface HeroProps {
  isDrawerOpen: boolean;
  onOpenDrawer: () => void;
}

const IMAGE_COLOR_FALLBACK = '#FFFFFF';

const getReadableContentColor = (backgroundColor: string) => {
  const hex = backgroundColor.replace('#', '').slice(0, 6);
  if (hex.length !== 6) {
    return '#211F1E';
  }
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 145
    ? '#211F1E'
    : '#FFFFFF';
};

const HeroTopButton = ({
  disabled = false,
  icon,
  iconColor,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={({pressed}) => ({
      alignItems: 'center',
      height: 48,
      justifyContent: 'center',
      opacity: disabled ? 0 : pressed ? 0.62 : 1,
      width: 48,
    })}>
    <MaterialCommunityIcons name={icon} size={30} color={iconColor} />
  </Pressable>
);

const Hero = memo(({isDrawerOpen, onOpenDrawer}: HeroProps) => {
  const colors = useM3Colors();
  const insets = useSafeAreaInsets();
  const [logoFailed, setLogoFailed] = useState(false);
  const [searchButtonColor, setSearchButtonColor] = useState('#FFFFFF');
  const provider = useContentStore(state => state.provider);
  const hero = useHeroStore(state => state.hero);
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const {data: heroData, error} = useHeroMetadata(
    hero?.link || '',
    provider?.value || '',
  );

  const imageSource = useMemo(
    () => ({
      uri:
        heroData?.background ||
        heroData?.image ||
        heroData?.poster ||
        hero?.image ||
        '',
    }),
    [hero?.image, heroData],
  );
  const imageUri = imageSource.uri;

  useEffect(() => {
    setSearchButtonColor(IMAGE_COLOR_FALLBACK);
  }, [hero?.link]);

  useEffect(() => {
    setLogoFailed(false);
  }, [heroData?.logo]);


  const updateSearchButtonColor = useCallback(async () => {
    if (!imageUri) {
      return;
    }
    try {
      const imageColors = await getColors(imageUri, {
        cache: true,
        fallback: IMAGE_COLOR_FALLBACK,
        key: `hero-accent-v2:${imageUri}`,
        pixelSpacing: 8,
      });
      const candidates =
        imageColors.platform === 'android'
          ? [
              imageColors.lightVibrant,
              imageColors.vibrant,
              imageColors.dominant,
              imageColors.average,
              imageColors.darkVibrant,
            ]
          : imageColors.platform === 'ios'
            ? [imageColors.primary, imageColors.secondary]
            : [imageColors.vibrant, imageColors.dominant];
      const extractedColor = candidates.find(
        candidate =>
          candidate.toUpperCase() !== IMAGE_COLOR_FALLBACK.toUpperCase(),
      );
      if (extractedColor) {
        setSearchButtonColor(mixHex(extractedColor, '#FFFFFF', 0.72));
      }
    } catch {}
  }, [imageUri]);
  const genres = useMemo(
    () => (heroData?.genre || heroData?.tags || []).slice(0, 3),
    [heroData],
  );
  const openDetails = useCallback(() => {
    if (!hero?.link) {
      return;
    }
    navigation.navigate('Info', {
      link: hero.link,
      provider: provider?.value || '',
      poster: heroData?.poster || heroData?.image || heroData?.background,
    });
  }, [hero, heroData, navigation, provider?.value]);

  return (
    <View
      style={{
        backgroundColor: colors.surfaceContainerLow,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        height: 410,
        overflow: 'hidden',
      }}>
      {!imageUri ? (
        <View
          style={{flex: 1, backgroundColor: colors.surfaceContainerHighest}}
        />
      ) : (
        <Animated.Image
          entering={FadeIn.duration(450)}
          source={imageSource}
          onLoad={updateSearchButtonColor}
          resizeMode="cover"
          style={{height: '100%', width: '100%'}}
        />
      )}

      <LinearGradient
        colors={[
          'rgba(0,0,0,0.2)',
          'rgba(0,0,0,0.08)',
          'rgba(0,0,0,0.72)',
          colors.background,
        ]}
        locations={[0, 0.28, 0.7, 1]}
        style={{position: 'absolute', inset: 0}}
      />

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          left: 16,
          position: 'absolute',
          right: 16,
          top: insets.top + 6,
        }}>
<HeroTopButton
          icon="menu"
          iconColor={searchButtonColor}
          label="Open provider drawer"
          disabled={isDrawerOpen}
          onPress={onOpenDrawer}
        />
        <HeroTopButton
          icon="cog"
          iconColor={searchButtonColor}
          label="Settings"
          onPress={() => navigation.navigate('SettingsStack' as any)}
        />
      </View>

      <Animated.View
        entering={FadeInDown.delay(100).springify().damping(18).stiffness(180)}
        style={{
          alignItems: 'center',
          bottom: 22,
          left: 20,
          position: 'absolute',
          right: 20,
        }}>
        {heroData?.logo && !logoFailed ? (
          <Image
            source={{uri: heroData.logo}}
            onError={() => setLogoFailed(true)}
            resizeMode="contain"
            style={{height: 94, width: 280}}
          />
        ) : heroData?.title || hero?.title ? (
          <AppText
            numberOfLines={2}
            role="headlineLarge"
            style={{
              color: '#FFFFFF',
              maxWidth: 300,
              textAlign: 'center',
            }}>
            {heroData?.title || hero?.title}
          </AppText>
        ) : null}

        {genres.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              marginTop: 10,
            }}>
            {genres.map((genre: string) => (
              <View
                key={genre}
                style={{
                  backgroundColor: 'rgba(32, 28, 28, 0.82)',
                  borderColor: 'rgba(255,255,255,0.24)',
                  borderRadius: 12,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}>
                <AppText
                  role="labelMediumEmphasized"
                  style={{color: '#FFFFFF'}}>
                  {genre}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: 14,
            width: '100%',
          }}>
          <Button
            variant="filled"
            containerColor={searchButtonColor}
            contentColor={getReadableContentColor(searchButtonColor)}
            onPress={openDetails}>
            Watch now
          </Button>
        </View>
        {error ? (
          <AppText
            role="bodySmall"
            style={{
              color: colors.onSurfaceVariant,
              marginTop: 10,
              textAlign: 'center',
            }}>
            Some featured details are unavailable
          </AppText>
        ) : null}
      </Animated.View>
    </View>
  );
});

Hero.displayName = 'Hero';

export default Hero;
