import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {Host, LoadingIndicator} from '@expo/ui/jetpack-compose';
import {size as indicatorSize} from '@expo/ui/jetpack-compose/modifiers';
import {StatusBar} from 'expo-status-bar';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import {useTmdbStory} from '../../../lib/hooks/useTmdbStory';
import type {
  TmdbStoryCollectionItem,
  TmdbStoryData,
} from '../../../lib/hooks/useTmdbStory';
import {
  useM3Colors,
  useM3HostTheme,
} from '../../../theme/M3PaletteContext';
import AppText from '../../../components/ui/Text';

interface InfoStoryModalProps {
  fallbackBackdrop?: string;
  fallbackOverview?: string;
  fallbackTitle?: string;
  imdbId?: string;
  onClose: () => void;
  tmdbId?: number | string;
  type?: string;
  visible: boolean;
}

interface StoryPage {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  key: string;
  title: string;
}

const getTmdbImage = (
  path?: string,
  size: 'w342' | 'w780' = 'w780',
): string | undefined =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

const formatCount = (value?: number): string | undefined => {
  if (!value) {
    return undefined;
  }
  return new Intl.NumberFormat('en', {notation: 'compact'}).format(value);
};

const formatRuntime = (minutes?: number): string | undefined => {
  if (!minutes) {
    return undefined;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours}h ${remaining}m` : `${remaining}m`;
};

const SectionHeading = ({
  icon,
  title,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
}) => {
  const colors = useM3Colors();

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        marginBottom: 18,
      }}>
      <MaterialCommunityIcons name={icon} size={26} color={colors.primary} />
      <AppText role="titleLargeEmphasized" style={{color: colors.onBackground}}>
        {title}
      </AppText>
    </View>
  );
};

const ChipList = ({items}: {items: string[]}) => {
  const colors = useM3Colors();

  if (!items.length) {
    return null;
  }

  return (
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
      {items.map(item => (
        <View
          key={item}
          style={{
            backgroundColor: colors.surfaceContainerHigh,
            borderColor: colors.outlineVariant,
            borderRadius: 16,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}>
          <AppText
            role="labelMediumEmphasized"
            style={{color: colors.onSurface}}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
};

const AboutPage = ({
  data,
  fallbackBackdrop,
  fallbackOverview,
  fallbackTitle,
}: {
  data: TmdbStoryData;
  fallbackBackdrop?: string;
  fallbackOverview?: string;
  fallbackTitle?: string;
}) => {
  const colors = useM3Colors();
  const backdropChoices = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...(data.backdropPaths ?? []).map(path => getTmdbImage(path)),
            fallbackBackdrop,
          ].filter(Boolean),
        ),
      ) as string[],
    [data.backdropPaths, fallbackBackdrop],
  );
  const [backdropIndex, setBackdropIndex] = useState(0);
  const backdrop = backdropChoices[backdropIndex];

  useEffect(() => {
    setBackdropIndex(0);
    if (backdropChoices.length < 2) {
      return;
    }
    const timer = setInterval(() => {
      setBackdropIndex(index => (index + 1) % backdropChoices.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [backdropChoices]);

  return (
    <>
      {backdrop ? (
        <Image
          key={backdrop}
          fadeDuration={500}
          source={{uri: backdrop}}
          resizeMode="cover"
          style={{
            aspectRatio: 16 / 9,
            backgroundColor: colors.surfaceContainer,
            borderRadius: 28,
            width: '100%',
          }}
        />
      ) : null}
      <AppText
        role="headlineLargeEmphasized"
        style={{color: colors.onBackground, marginTop: 24}}>
        {data.title || fallbackTitle}
      </AppText>
      {data.tagline ? (
        <AppText
          role="titleMedium"
          style={{color: colors.primary, marginTop: 7}}>
          {data.tagline}
        </AppText>
      ) : null}
      <View style={{marginTop: 34}}>
        <SectionHeading icon="movie-open-outline" title="What's it about" />
        <AppText
          role="titleLarge"
          style={{
            color: colors.onSurfaceVariant,
            fontSize: 20,
            lineHeight: 30,
          }}>
          {data.overview || fallbackOverview || 'No overview is available.'}
        </AppText>
      </View>
    </>
  );
};

const TrailerPage = ({
  active,
  data,
}: {
  active: boolean;
  data: TmdbStoryData;
}) => {
  const colors = useM3Colors();
  const youtubeOrigin = 'https://airflix.app';
  const trailerUrl = `https://www.youtube.com/embed/${encodeURIComponent(
    data.trailerKey || '',
  )}?playsinline=1&rel=0&modestbranding=1&origin=${encodeURIComponent(
    youtubeOrigin,
  )}`;
  const youtubeUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(
    data.trailerKey || '',
  )}`;
  const playerHtml = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
    <style>
      html, body, iframe { width: 100%; height: 100%; margin: 0; padding: 0; border: 0; overflow: hidden; background: #000; }
    </style>
  </head>
  <body>
    <iframe
      src="${trailerUrl}"
      title="YouTube trailer"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen>
    </iframe>
  </body>
</html>`;

  return (
    <>
      <SectionHeading icon="movie-play-outline" title="Trailer" />
      <View
        onTouchEnd={event => event.stopPropagation()}
        onTouchStart={event => event.stopPropagation()}
        style={{
          aspectRatio: 16 / 9,
          backgroundColor: '#000000',
          borderColor: colors.outlineVariant,
          borderRadius: 24,
          borderWidth: 1,
          overflow: 'hidden',
          width: '100%',
        }}>
        {active ? (
          <WebView
            androidLayerType="hardware"
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            domStorageEnabled
            javaScriptEnabled
            mediaPlaybackRequiresUserAction
            originWhitelist={['https://*']}
            setSupportMultipleWindows={false}
            source={{baseUrl: `${youtubeOrigin}/`, html: playerHtml}}
            style={{backgroundColor: '#000000', flex: 1}}
            thirdPartyCookiesEnabled
          />
        ) : (
          <View
            style={{
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
            }}>
            <MaterialCommunityIcons
              name="play-circle-outline"
              size={72}
              color={colors.primary}
            />
          </View>
        )}
      </View>
      <AppText
        role="titleLargeEmphasized"
        style={{color: colors.onBackground, marginTop: 22}}>
        {data.trailerName || `${data.title} trailer`}
      </AppText>
      <View
        onTouchEnd={event => event.stopPropagation()}
        onTouchStart={event => event.stopPropagation()}
        style={{alignItems: 'center', marginTop: 30, width: '100%'}}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open trailer in YouTube"
          activeOpacity={0.72}
          onPress={() => Linking.openURL(youtubeUrl)}
          style={{
            alignItems: 'center',
            backgroundColor: colors.primary,
            borderColor: colors.outline,
            borderRadius: 27,
            borderWidth: 1,
            elevation: 5,
            flexDirection: 'row',
            gap: 12,
            height: 54,
            justifyContent: 'center',
            paddingHorizontal: 28,
            shadowColor: colors.primary,
            shadowOffset: {height: 3, width: 0},
            shadowOpacity: 0.35,
            shadowRadius: 7,
          }}>
          <MaterialCommunityIcons
            name="youtube"
            size={26}
            color={colors.onPrimary}
          />
          <AppText
            role="labelLargeEmphasized"
            style={{color: colors.onPrimary}}>
            Open in YouTube
          </AppText>
        </TouchableOpacity>
      </View>
    </>
  );
};

const CastPage = ({data}: {data: TmdbStoryData}) => {
  const colors = useM3Colors();

  return (
    <>
      <SectionHeading icon="account-group-outline" title="Cast" />
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
        {data.cast.map(person => {
          const image = getTmdbImage(person.profilePath, 'w342');
          return (
            <View
              key={person.id}
              style={{
                backgroundColor: colors.surfaceContainerLow,
                borderRadius: 22,
                flexBasis: '47%',
                flexGrow: 1,
                overflow: 'hidden',
              }}>
              {image ? (
                <Image
                  source={{uri: image}}
                  resizeMode="cover"
                  style={{
                    aspectRatio: 0.78,
                    backgroundColor: colors.surfaceContainer,
                    width: '100%',
                  }}
                />
              ) : (
                <View
                  style={{
                    alignItems: 'center',
                    aspectRatio: 0.78,
                    backgroundColor: colors.surfaceContainer,
                    justifyContent: 'center',
                    width: '100%',
                  }}>
                  <MaterialCommunityIcons
                    name="account"
                    size={64}
                    color={colors.outline}
                  />
                </View>
              )}
              <View style={{padding: 12}}>
                <AppText
                  role="labelLargeEmphasized"
                  numberOfLines={2}
                  style={{color: colors.onSurface}}>
                  {person.name}
                </AppText>
                {person.character ? (
                  <AppText
                    role="bodySmall"
                    numberOfLines={2}
                    style={{color: colors.onSurfaceVariant, marginTop: 3}}>
                    {person.character}
                  </AppText>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
};

const FactCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
}) => {
  const colors = useM3Colors();

  return (
    <View
      style={{
        backgroundColor: colors.surfaceContainerLow,
        borderColor: colors.outlineVariant,
        borderRadius: 20,
        borderWidth: 1,
        flexBasis: '47%',
        flexGrow: 1,
        minHeight: 108,
        padding: 16,
      }}>
      <MaterialCommunityIcons name={icon} size={26} color={colors.primary} />
      <AppText
        role="titleMediumEmphasized"
        style={{color: colors.onSurface, marginTop: 12}}>
        {value}
      </AppText>
      <AppText
        role="bodySmall"
        style={{color: colors.onSurfaceVariant, marginTop: 3}}>
        {label}
      </AppText>
    </View>
  );
};

const FactsPage = ({data}: {data: TmdbStoryData}) => {
  const colors = useM3Colors();
  const facts = [
    data.trendingRank
      ? {
          icon: 'trending-up' as const,
          label: 'Trending this week',
          value: `#${data.trendingRank}`,
        }
      : null,
    data.rating
      ? {
          icon: 'star-outline' as const,
          label: `${formatCount(data.voteCount) || 'TMDB'} votes`,
          value: `${data.rating.toFixed(1)}/10`,
        }
      : null,
    data.certification
      ? {
          icon: 'shield-outline' as const,
          label: 'Content rating',
          value: data.certification,
        }
      : null,
    data.releaseDate
      ? {
          icon: 'calendar-blank-outline' as const,
          label: 'Released',
          value: data.releaseDate.slice(0, 4),
        }
      : null,
    data.runtime
      ? {
          icon: 'clock-outline' as const,
          label: data.mediaType === 'tv' ? 'Episode runtime' : 'Runtime',
          value: formatRuntime(data.runtime) || '',
        }
      : null,
    data.status
      ? {
          icon: 'information-outline' as const,
          label: 'Status',
          value: data.status,
        }
      : null,
  ].filter(Boolean) as {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    value: string;
  }[];

  return (
    <>
      <SectionHeading icon="chart-box-outline" title="Ratings & facts" />
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
        {facts.map(fact => (
          <FactCard
            key={`${fact.label}-${fact.value}`}
            icon={fact.icon}
            label={fact.label}
            value={fact.value}
          />
        ))}
      </View>

      {data.creators.length ? (
        <View style={{marginTop: 30}}>
          <AppText
            role="titleMediumEmphasized"
            style={{color: colors.onBackground, marginBottom: 10}}>
            {data.mediaType === 'tv' ? 'Created by' : 'Directed by'}
          </AppText>
          <ChipList items={data.creators} />
        </View>
      ) : null}
      {data.genres.length ? (
        <View style={{marginTop: 26}}>
          <AppText
            role="titleMediumEmphasized"
            style={{color: colors.onBackground, marginBottom: 10}}>
            Genres
          </AppText>
          <ChipList items={data.genres} />
        </View>
      ) : null}
      {data.keywords.length ? (
        <View style={{marginTop: 26}}>
          <AppText
            role="titleMediumEmphasized"
            style={{color: colors.onBackground, marginBottom: 10}}>
            Themes
          </AppText>
          <ChipList items={data.keywords} />
        </View>
      ) : null}
      {data.companies.length || data.networks.length ? (
        <View style={{marginTop: 26}}>
          <AppText
            role="titleMediumEmphasized"
            style={{color: colors.onBackground, marginBottom: 8}}>
            Production
          </AppText>
          <AppText
            role="bodyLarge"
            style={{color: colors.onSurfaceVariant, lineHeight: 25}}>
            {[...data.networks, ...data.companies].join(' · ')}
          </AppText>
        </View>
      ) : null}
      {data.countries.length || data.originalLanguage ? (
        <AppText
          role="bodyMedium"
          style={{
            color: colors.outline,
            lineHeight: 22,
            marginTop: 22,
          }}>
          {[...data.countries, data.originalLanguage]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
      ) : null}
    </>
  );
};

const CollectionRow = ({item}: {item: TmdbStoryCollectionItem}) => {
  const colors = useM3Colors();
  const image = getTmdbImage(item.imagePath, 'w342');

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: 22,
        flexDirection: 'row',
        marginBottom: 12,
        minHeight: 118,
        overflow: 'hidden',
      }}>
      {image ? (
        <Image
          source={{uri: image}}
          resizeMode="cover"
          style={{
            alignSelf: 'stretch',
            backgroundColor: colors.surfaceContainer,
            width: 82,
          }}
        />
      ) : (
        <View
          style={{
            alignItems: 'center',
            alignSelf: 'stretch',
            backgroundColor: colors.surfaceContainer,
            justifyContent: 'center',
            width: 82,
          }}>
          <MaterialCommunityIcons
            name="movie-open-outline"
            size={34}
            color={colors.outline}
          />
        </View>
      )}
      <View style={{flex: 1, padding: 16}}>
        <AppText role="titleMediumEmphasized" style={{color: colors.onSurface}}>
          {item.title}
        </AppText>
        {item.subtitle ? (
          <AppText
            role="bodyMedium"
            style={{color: colors.onSurfaceVariant, marginTop: 5}}>
            {item.subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};

const CollectionPage = ({data}: {data: TmdbStoryData}) => (
  <>
    <SectionHeading
      icon={
        data.mediaType === 'tv'
          ? 'television-classic'
          : 'filmstrip-box-multiple'
      }
      title={
        data.collectionTitle ||
        (data.mediaType === 'tv' ? 'Seasons' : 'Collection')
      }
    />
    {data.collectionItems.map(item => (
      <CollectionRow key={item.id} item={item} />
    ))}
  </>
);

const InfoStoryModal = ({
  fallbackBackdrop,
  fallbackOverview,
  fallbackTitle,
  imdbId,
  onClose,
  tmdbId,
  type,
  visible,
}: InfoStoryModalProps) => {
  const colors = useM3Colors();
  const hostTheme = useM3HostTheme();
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [pageIndex, setPageIndex] = useState(0);
  const storyListRef = useRef<FlatList<StoryPage>>(null);
  const touchStart = useRef<{time: number; x: number; y: number} | undefined>(
    undefined,
  );
  const {data, error, isFetching, refetch} = useTmdbStory({
    enabled: visible,
    imdbId,
    tmdbId,
    type,
  });
  const pages = useMemo<StoryPage[]>(() => {
    const items: StoryPage[] = [
      {icon: 'movie-open-outline', key: 'about', title: 'About'},
    ];
    if (data?.trailerKey) {
      items.push({
        icon: 'movie-play-outline',
        key: 'trailer',
        title: 'Trailer',
      });
    }
    if (data?.cast.length) {
      items.push({
        icon: 'account-group-outline',
        key: 'cast',
        title: 'Cast',
      });
    }
    items.push({icon: 'chart-box-outline', key: 'facts', title: 'Facts'});
    if (data?.collectionItems.length) {
      items.push({
        icon:
          data.mediaType === 'tv'
            ? 'television-classic'
            : 'filmstrip-box-multiple',
        key: 'collection',
        title: data.mediaType === 'tv' ? 'Seasons' : 'Collection',
      });
    }
    return items;
  }, [data]);

  useEffect(() => {
    if (visible) {
      setPageIndex(0);
    }
  }, [visible]);

  const goToPage = (nextIndex: number) => {
    setPageIndex(nextIndex);
    storyListRef.current?.scrollToOffset({
      animated: true,
      offset: nextIndex * width,
    });
  };

  const handleStoryTap = (x: number) => {
    if (x >= width / 2) {
      if (pageIndex >= pages.length - 1) {
        onClose();
        return;
      }
      goToPage(pageIndex + 1);
      return;
    }

    if (pageIndex > 0) {
      goToPage(pageIndex - 1);
    }
  };

  const renderPage = ({item}: {item: StoryPage}) => {
    if (!data) {
      return null;
    }
    return (
      <ScrollView
        style={{width}}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 48,
          paddingHorizontal: 20,
          paddingTop: 86,
        }}>
        {item.key === 'about' ? (
          <AboutPage
            data={data}
            fallbackBackdrop={fallbackBackdrop}
            fallbackOverview={fallbackOverview}
            fallbackTitle={fallbackTitle}
          />
        ) : item.key === 'trailer' ? (
          <TrailerPage active={pageIndex === pages.indexOf(item)} data={data} />
        ) : item.key === 'cast' ? (
          <CastPage data={data} />
        ) : item.key === 'collection' ? (
          <CollectionPage data={data} />
        ) : (
          <FactsPage data={data} />
        )}
      </ScrollView>
    );
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}>
      <SafeAreaView
        edges={['top', 'bottom']}
        onTouchCancel={() => {
          touchStart.current = undefined;
        }}
        onTouchEnd={event => {
          const start = touchStart.current;
          touchStart.current = undefined;
          if (!data || !start) {
            return;
          }
          const {pageX, pageY, timestamp} = event.nativeEvent;
          const isTap =
            Math.abs(pageX - start.x) <= 12 &&
            Math.abs(pageY - start.y) <= 12 &&
            timestamp - start.time <= 500;
          const isBelowStoryHeader = pageY > insets.top + 58;
          if (isTap && isBelowStoryHeader) {
            handleStoryTap(pageX);
          }
        }}
        onTouchStart={event => {
          const {pageX, pageY, timestamp} = event.nativeEvent;
          touchStart.current = {time: timestamp, x: pageX, y: pageY};
        }}
        style={{backgroundColor: colors.background, flex: 1}}>
        <StatusBar style="light" />
        <View
          pointerEvents="none"
          style={{
            backgroundColor: colors.primary,
            borderRadius: 260,
            height: 520,
            left: -150,
            opacity: 0.07,
            position: 'absolute',
            top: -180,
            width: 520,
          }}
        />

        {data ? (
          <FlatList
            key={`${data.id}-${visible}`}
            ref={storyListRef}
            data={pages}
            extraData={pageIndex}
            horizontal
            pagingEnabled
            bounces={false}
            keyExtractor={item => item.key}
            renderItem={renderPage}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={event => {
              setPageIndex(
                Math.round(event.nativeEvent.contentOffset.x / width),
              );
            }}
          />
        ) : (
          <View
            style={{
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
              padding: 28,
            }}>
            {isFetching ? (
              <Host matchContents {...hostTheme}>
                <LoadingIndicator
                  color={colors.primary}
                  modifiers={[indicatorSize(56, 56)]}
                />
              </Host>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="book-alert-outline"
                  size={54}
                  color={colors.error}
                />
                <AppText
                  role="titleLargeEmphasized"
                  style={{
                    color: colors.onSurface,
                    marginTop: 18,
                    textAlign: 'center',
                  }}>
                  Story unavailable
                </AppText>
                <AppText
                  role="bodyMedium"
                  style={{
                    color: colors.onSurfaceVariant,
                    marginTop: 8,
                    textAlign: 'center',
                  }}>
                  {error instanceof Error
                    ? error.message
                    : 'TMDB metadata could not be loaded.'}
                </AppText>
                <Pressable
                  onPress={() => refetch()}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 24,
                    marginTop: 22,
                    paddingHorizontal: 22,
                    paddingVertical: 12,
                  }}>
                  <AppText
                    role="labelLargeEmphasized"
                    style={{color: colors.onPrimary}}>
                    Try again
                  </AppText>
                </Pressable>
              </>
            )}
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            gap: 7,
            left: 20,
            position: 'absolute',
            right: 74,
            top: insets.top + 14,
          }}>
          {pages.map((page, index) => (
            <View
              key={page.key}
              style={{
                backgroundColor:
                  index === pageIndex ? colors.primary : colors.outlineVariant,
                borderRadius: 2,
                flex: 1,
                height: 6,
                opacity: index < pageIndex ? 0.65 : 1,
              }}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close story"
          hitSlop={10}
          onPress={onClose}
          style={{
            alignItems: 'center',
            height: 48,
            justifyContent: 'center',
            position: 'absolute',
            right: 10,
            top: insets.top - 1,
            width: 48,
          }}>
          <MaterialCommunityIcons
            name="close"
            size={34}
            color={colors.onBackground}
          />
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
};

export default InfoStoryModal;
