import {
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  ToastAndroid,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, {useState} from 'react';
import {TextTracks, TextTrackType} from 'react-native-video';
import DropdownField from './ui/DropdownField';
import AppText from './ui/Text';
import {useM3Colors} from '../theme/M3PaletteContext';
import PlayerMenuRow from './PlayerMenuRow';

const SearchSubtitles = ({
  searchQuery,
  setSearchQuery,
  setExternalSubs,
}: {
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  setExternalSubs: React.Dispatch<React.SetStateAction<TextTracks>>;
}) => {
  const colors = useM3Colors();
  const primary = colors.primary;
  const {width} = useWindowDimensions();
  const compact = width < 760;
  const contentWidth = Math.min(width - 32, 1120);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [subId, setSubId] = useState('eng');

  const subLanguageIds = [
    {name: 'English', id: 'eng'},
    {name: 'Spanish', id: 'spa'},
    {name: 'French', id: 'fre'},
    {name: 'German', id: 'ger'},
    {name: 'Italian', id: 'ita'},
    {name: 'Portuguese', id: 'por'},
    {name: 'Russian', id: 'rus'},
    {name: 'Chinese', id: 'chi'},
    {name: 'Japanese', id: 'jpn'},
    {name: 'Korean', id: 'kor'},
    {name: 'Arabic', id: 'ara'},
    {name: 'Hindi', id: 'hin'},
    {name: 'Dutch', id: 'dut'},
    {name: 'Swedish', id: 'swe'},
    {name: 'Polish', id: 'pol'},
    {name: 'Turkish', id: 'tur'},
    {name: 'Danish', id: 'dan'},
    {name: 'Norwegian', id: 'nor'},
    {name: 'Finnish', id: 'fin'},
    {name: 'Vietnamese', id: 'vie'},
    {name: 'Indonesian', id: 'ind'},
  ];

  const searchSubtitles = async () => {
    try {
      setError('');
      setLoading(true);
      console.log(
        'openSubtitles',
        `https://rest.opensubtitles.org/search${
          episode ? '/episode-' + episode : ''
        }${
          (searchQuery?.startsWith('tt') ? '/imdbid-' : '/query-') +
          encodeURIComponent(searchQuery.toLocaleLowerCase())
        }${season ? '/season-' + season : ''}${
          subId ? '/sublanguageid-' + subId : ''
        }`,
      );
      const response = await fetch(
        `https://rest.opensubtitles.org/search${
          episode ? '/episode-' + episode : ''
        }${
          (searchQuery?.startsWith('tt') ? '/imdbid-' : '/query-') +
          encodeURIComponent(searchQuery.toLocaleLowerCase())
        }${season ? '/season-' + season : ''}${
          subId ? '/sublanguageid-' + subId : ''
        }`,
        {
          method: 'GET',
          headers: {
            'x-user-agent': 'VLSub 0.10.2',
          },
        },
      );
      console.log('openSubtitles⭐', response);
      const data = await response.json();
      setLoading(false);
      if (data?.length === 0) {
        setError('No Results Found');
        setSearchResults([]);
        return;
      }
      setSearchResults(data);
    } catch (e: any) {
      console.log('openSubtitles err', e);
      setLoading(false);
      setError(e?.message);
      ToastAndroid.show('Error fetching subtitles', ToastAndroid.SHORT);
    }
  };
  return (
    <View>
      <PlayerMenuRow
        title="Search subtitles online"
        detail="Find a subtitle from OpenSubtitles"
        accentColor={primary}
        icon="travel-explore"
        onPress={() => setSearchModalVisible(true)}
      />
      <Modal
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        visible={searchModalVisible}
        onRequestClose={() => {
          setSearchModalVisible(false);
        }}>
        <SafeAreaView
          className="h-full w-full"
          style={{backgroundColor: 'rgba(0,0,0,0.96)'}}>
          <View
            className="flex-1 self-center"
            style={{width: contentWidth}}>
            <View className="flex-row items-center py-3">
              <TouchableOpacity
                accessibilityLabel="Close subtitle search"
                accessibilityRole="button"
                activeOpacity={0.72}
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{backgroundColor: 'rgba(255,255,255,0.08)'}}
                onPress={() => setSearchModalVisible(false)}>
                <MaterialIcons name="arrow-back" size={25} color="white" />
              </TouchableOpacity>
              <View className="ml-3">
                <AppText className="text-white text-xl font-bold">
                  Search subtitles
                </AppText>
                <AppText className="text-white/50 text-xs">
                  Search by title or IMDb ID
                </AppText>
              </View>
            </View>

            <View
              className="rounded-3xl p-3"
              style={{
                backgroundColor: 'rgba(20,20,20,0.92)',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
              }}>
              <TextInput
                placeholder="Title or IMDb ID"
                placeholderTextColor="rgba(255,255,255,0.42)"
                returnKeyType="search"
                className="h-14 rounded-2xl px-4 text-base text-white"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.065)',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                }}
                onChangeText={text => setSearchQuery(text)}
                onSubmitEditing={searchSubtitles}
                value={searchQuery}
              />

              <View
                className="mt-3 flex-row items-center"
                style={{gap: 10, flexWrap: compact ? 'wrap' : 'nowrap'}}>
                <View style={{flex: 1, minWidth: compact ? 190 : 220}}>
                  <DropdownField
                    options={subLanguageIds}
                    value={subLanguageIds.find(option => option.id === subId)}
                    getKey={option => option.id}
                    getLabel={option => option.name}
                    onChange={option => setSubId(option.id)}
                  />
                </View>
                <TextInput
                  placeholder="Season"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  keyboardType="numeric"
                  className="h-14 rounded-2xl px-4 text-white"
                  style={{
                    width: compact ? 100 : 120,
                    backgroundColor: 'rgba(255,255,255,0.065)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                  }}
                  onChangeText={text => setSeason(text)}
                  value={season}
                />
                <TextInput
                  placeholder="Episode"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  keyboardType="numeric"
                  className="h-14 rounded-2xl px-4 text-white"
                  style={{
                    width: compact ? 100 : 120,
                    backgroundColor: 'rgba(255,255,255,0.065)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                  }}
                  onChangeText={text => setEpisode(text)}
                  value={episode}
                />
                <TouchableOpacity
                  accessibilityLabel="Search subtitles"
                  accessibilityRole="button"
                  activeOpacity={0.76}
                  disabled={loading || !searchQuery.trim()}
                  className="h-14 flex-row items-center justify-center rounded-2xl px-5"
                  style={{
                    backgroundColor: primary,
                    opacity: loading || !searchQuery.trim() ? 0.45 : 1,
                  }}
                  onPress={searchSubtitles}>
                  <MaterialIcons
                    name="search"
                    size={24}
                    color={colors.onPrimary}
                  />
                  <AppText
                    className="ml-2 text-base font-bold"
                    style={{color: colors.onPrimary}}>
                    Search
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              className="mt-3 flex-1"
              contentContainerStyle={{flexGrow: 1, paddingBottom: 24}}>
            {loading ? (
              <View className="w-full h-full justify-center items-center">
                <ActivityIndicator size="large" color={primary} />
              </View>
            ) : (
              searchResults.map((result: any) => (
                <TouchableOpacity
                  key={result?.IDSubtitleFile}
                  activeOpacity={0.74}
                  className="my-1.5 flex-row items-center rounded-2xl p-3"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.055)',
                    borderColor: 'rgba(255,255,255,0.09)',
                    borderWidth: 1,
                  }}
                  onPress={() => {
                    setSearchModalVisible(false);
                    setExternalSubs(prev => [
                      {
                        type: TextTrackType.SUBRIP,
                        language: result?.ISO639,
                        title:
                          result?.InfoReleaseGroup + ' ' + result?.UserNickName,
                        uri: result?.SubDownloadLink?.replace('.gz', ''),
                      },
                      ...prev,
                    ]);
                  }}>
                  <View
                    className="mr-3 min-w-14 items-center rounded-xl px-2 py-2"
                    style={{backgroundColor: colors.primaryContainer}}>
                    <AppText
                      className="text-xs font-bold uppercase"
                      style={{color: colors.onPrimaryContainer}}>
                      {result?.ISO639 || result?.SubLanguageID || 'SUB'}
                    </AppText>
                  </View>
                  <View className="min-w-0 flex-1">
                    <AppText
                      className="text-white text-base font-semibold"
                      numberOfLines={1}>
                      {result?.MovieName?.trim() || 'Untitled subtitle'}
                    </AppText>
                    <AppText
                      className="mt-1 text-white/50 text-xs"
                      numberOfLines={1}>
                      {[result?.InfoReleaseGroup, result?.UserNickName]
                        .filter(Boolean)
                        .join(' · ') || 'OpenSubtitles'}
                    </AppText>
                  </View>
                  {(Number(result?.SeriesSeason) > 0 ||
                    Number(result?.SeriesEpisode) > 0) && (
                    <View className="mx-3 flex-row" style={{gap: 6}}>
                      {Number(result?.SeriesSeason) > 0 && (
                        <AppText className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/75">
                          S{result?.SeriesSeason}
                        </AppText>
                      )}
                      {Number(result?.SeriesEpisode) > 0 && (
                        <AppText className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/75">
                          E{result?.SeriesEpisode}
                        </AppText>
                      )}
                    </View>
                  )}
                  <MaterialIcons
                    name="download"
                    size={22}
                    color={primary}
                  />
                </TouchableOpacity>
              ))
            )}
            {searchResults.length === 0 && !loading && (
              <View className="w-full h-full justify-center items-center">
                <MaterialIcons
                  name={error ? 'error-outline' : 'subtitles'}
                  size={38}
                  color={error ? colors.error : colors.onSurfaceVariant}
                />
                <AppText
                  className="mt-3 text-base font-semibold"
                  style={{
                    color: error ? colors.error : colors.onSurfaceVariant,
                  }}>
                  {error || 'Search to find available subtitles'}
                </AppText>
              </View>
            )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default SearchSubtitles;
