import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, {useEffect, useMemo, useState} from 'react';
import {Image, Linking, Pressable, TouchableOpacity, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useM3Colors} from '../../../theme/M3PaletteContext';
import SkeletonLoader from '../../../components/Skeleton';
import AppText from '../../../components/ui/Text';

interface ContentOverviewProps {
  backgroundImage: string;
  genres?: string[];
  inLibrary: boolean;
  isLoading: boolean;
  logo?: string;
  onBack: () => void;
  onOpenStory?: () => void;
  onOpenWeb?: () => void;
  onSearchTitle: () => void;
  onToggleLibrary: () => void;
  onToggleSynopsis: () => void;
  providerName: string;
  rating?: string;
  readMore: boolean;
  runtime?: string;
  synopsis: string;
  synopsisLoading: boolean;
  tags?: string[];
  title?: string;
  trailerUrl?: string;
  year?: string;
}

const HeaderIconButton = ({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
}) => {
  const colors = useM3Colors();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        alignItems: 'center',
        height: 44,
        justifyContent: 'center',
        width: 44,
      }}>
      <MaterialCommunityIcons name={icon} size={28} color={colors.primary} />
    </TouchableOpacity>
  );
};

const InfoAction = ({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
}) => {
  const colors = useM3Colors();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.65}
      onPress={onPress}
      style={{
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-start',
        minHeight: 76,
        paddingHorizontal: 4,
        paddingVertical: 8,
      }}>
      <MaterialCommunityIcons name={icon} size={30} color={colors.primary} />
      <AppText
        role="labelMediumEmphasized"
        numberOfLines={2}
        style={{
          color: colors.onSurfaceVariant,
          marginTop: 9,
          textAlign: 'center',
        }}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
};

const CompactChip = ({label}: {label: string}) => {
  const colors = useM3Colors();

  return (
    <View
      style={{
        backgroundColor: '#171717',
        borderRadius: 8,
        paddingHorizontal: 9,
        paddingVertical: 5,
      }}>
      <AppText role="labelMediumEmphasized" style={{color: colors.primary}}>
        {label}
      </AppText>
    </View>
  );
};

const ContentOverview = ({
  backgroundImage,
  genres,
  inLibrary,
  isLoading,
  logo,
  onBack,
  onOpenStory,
  onOpenWeb,
  onSearchTitle,
  onToggleLibrary,
  onToggleSynopsis,
  providerName,
  rating,
  readMore,
  runtime,
  synopsis,
  synopsisLoading,
  tags,
  title,
  trailerUrl,
  year,
}: ContentOverviewProps) => {
  const colors = useM3Colors();
  const [logoFailed, setLogoFailed] = useState(false);
  const metadata = useMemo(
    () =>
      [year, runtime, ...(genres ?? []), ...(tags ?? [])]
        .filter(Boolean)
        .map(String)
        .slice(0, 6),
    [genres, runtime, tags, year],
  );
  const synopsisText =
    synopsis.length > 240 && !readMore
      ? `${synopsis.slice(0, 240)}...`
      : synopsis;
  const normalizedRating = rating?.replace(/\s*\/\s*10$/i, '').trim();

  useEffect(() => {
    setLogoFailed(false);
  }, [logo]);

  return (
    <View style={{backgroundColor: colors.background}}>
      <View
        style={{
          backgroundColor: colors.background,
          height: 340,
          overflow: 'hidden',
          width: '100%',
        }}>
        <Image
          source={{uri: backgroundImage}}
          resizeMode="cover"
          style={{
            height: 340,
            position: 'absolute',
            top: 0,
            width: '100%',
          }}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.1)', colors.background]}
          locations={[0, 0.58, 1]}
          style={{
            height: 340,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
          }}
        />

        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            left: 12,
            position: 'absolute',
            top: 42,
          }}>
          <HeaderIconButton
            icon="arrow-left"
            label="Go back"
            onPress={onBack}
          />
        </View>
      </View>

      <View style={{paddingHorizontal: 20}}>
        <View
          style={{
            alignItems: 'flex-end',
            flexDirection: 'row',
            gap: 16,
            justifyContent: 'space-between',
          }}>
          <View style={{flex: 1, minWidth: 0}}>
            {isLoading ? (
              <SkeletonLoader show height={38} width={190} marginVertical={0} />
            ) : logo && !logoFailed ? (
              <Image
                source={{uri: logo}}
                onError={() => setLogoFailed(true)}
                resizeMode="contain"
                style={{height: 64, width: 220}}
              />
            ) : (
              <AppText
                role="headlineMediumEmphasized"
                numberOfLines={2}
                style={{color: colors.onBackground}}>
                {title || 'Unknown title'}
              </AppText>
            )}
          </View>
          {normalizedRating ? (
            <View
              style={{
                alignItems: 'baseline',
                flexDirection: 'row',
                paddingBottom: 4,
              }}>
              <AppText
                role="headlineMediumEmphasized"
                style={{color: colors.onBackground}}>
                {normalizedRating}
              </AppText>
              <AppText
                role="titleMediumEmphasized"
                style={{color: colors.onSurfaceVariant}}>
                /10
              </AppText>
            </View>
          ) : null}
        </View>

        {metadata.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 7,
              marginTop: 16,
            }}>
            {metadata.map(item => (
              <CompactChip key={item} label={item} />
            ))}
          </View>
        ) : null}

        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
          }}>
          <View style={{alignItems: 'center', flexDirection: 'row', flex: 1}}>
            <AppText
              role="titleLargeEmphasized"
              style={{color: colors.onBackground, marginRight: 12}}>
              Synopsis
            </AppText>
            <AppText
              role="labelLargeEmphasized"
              numberOfLines={1}
              style={{color: colors.primary}}>
              {providerName}
            </AppText>
          </View>
        </View>

        {synopsisLoading ? (
          <View style={{gap: 7, marginTop: 12}}>
            <SkeletonLoader show height={18} width="100%" marginVertical={0} />
            <SkeletonLoader show height={18} width="94%" marginVertical={0} />
            <SkeletonLoader show height={18} width="72%" marginVertical={0} />
          </View>
        ) : (
          <AppText
            role="bodyLarge"
            style={{
              color: colors.onSurfaceVariant,
              lineHeight: 24,
              marginTop: 10,
            }}>
            {synopsisText}
          </AppText>
        )}
        {!synopsisLoading && synopsis.length > 240 ? (
          <Pressable onPress={onToggleSynopsis} style={{paddingVertical: 8}}>
            <AppText
              role="labelLargeEmphasized"
              style={{color: colors.primary}}>
              {readMore ? 'Show less' : 'Read more'}
            </AppText>
          </Pressable>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: -4,
            marginTop: 18,
          }}>
          <InfoAction icon="magnify" label="Search" onPress={onSearchTitle} />
          {onOpenWeb ? (
            <InfoAction icon="web" label="Web" onPress={onOpenWeb} />
          ) : null}
          {onOpenStory ? (
            <InfoAction
              icon="book-open-page-variant-outline"
              label="Explore"
              onPress={onOpenStory}
            />
          ) : trailerUrl ? (
            <InfoAction
              icon="movie-play-outline"
              label="Trailer"
              onPress={() => Linking.openURL(trailerUrl)}
            />
          ) : null}
          <InfoAction
            icon={inLibrary ? 'bookmark' : 'bookmark-outline'}
            label={inLibrary ? 'In watchlist' : 'Watchlist'}
            onPress={onToggleLibrary}
          />
        </View>
      </View>
    </View>
  );
};

export default ContentOverview;
