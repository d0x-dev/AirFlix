import {useQuery} from '@tanstack/react-query';
import {useState, useEffect, useMemo, useRef} from 'react';
import {ToastAndroid} from 'react-native';
import {providerManager} from '../services/ProviderManager';
import {settingsStorage} from '../storage';
import {ifExists} from '../file/ifExists';
import {Stream} from '../providers/types';
import {getEpisodeIdentity} from '../utils/episodeIdentity';

interface UseStreamOptions {
  activeEpisode: any;
  routeParams: any;
  provider: string;
  enabled?: boolean;
}

export const useStream = ({
  activeEpisode,
  routeParams,
  provider,
  enabled = true,
}: UseStreamOptions) => {
  const [selectedStream, setSelectedStream] = useState<Stream>({
    server: '',
    link: '',
    type: '',
  });
  const [externalSubs, setExternalSubs] = useState<any[]>([]);

  // A locally-picked/auto-resumed video file is only ever valid for the
  // episode it was picked for. Whenever the active episode changes, clear
  // the selection back to neutral so the stream-data effect below falls
  // through to picking the new episode's first online stream, instead of
  // silently carrying over the old episode's local file (see the
  // 'local' guard further down).
  const activeEpisodeKey = getEpisodeIdentity(activeEpisode);
  const previousEpisodeKeyRef = useRef(activeEpisodeKey);

  useEffect(() => {
    if (previousEpisodeKeyRef.current === activeEpisodeKey) {
      return;
    }
    previousEpisodeKeyRef.current = activeEpisodeKey;
    setSelectedStream({server: '', link: '', type: ''});
  }, [activeEpisodeKey]);

  const {
    data: streamData = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Stream[], Error>({
    queryKey: ['stream', activeEpisode?.link, routeParams?.type, provider],
    queryFn: async () => {
      if (!activeEpisode?.link) {
        return [];
      }

      console.log('Fetching stream for:', activeEpisode);

      // Handle direct URL (downloaded content)
      if (routeParams?.directUrl) {
        return [
          {server: 'Downloaded', link: routeParams.directUrl, type: 'mp4'},
        ];
      }

      // Check for local downloaded file
      if (routeParams?.primaryTitle) {
        const file = (
          routeParams.primaryTitle +
          (routeParams.secondaryTitle || '') +
          (activeEpisode?.title || '')
        ).replaceAll(/[^a-zA-Z0-9]/g, '_');

        const exists = await ifExists(file);
        if (exists) {
          return [{server: 'downloaded', link: exists, type: 'mp4'}];
        }
      }

      // Fetch streams from provider
      const controller = new AbortController();
      const data = await providerManager.getStream({
        link: activeEpisode.link,
        type: routeParams?.type,
        signal: controller.signal,
        providerValue: routeParams?.providerValue || provider,
      });

      // Filter out excluded qualities
      const excludedQualities = settingsStorage.getExcludedQualities() || [];
      const filteredQualities = data?.filter(
        streamItem => !excludedQualities.includes(streamItem?.quality + 'p'),
      );

      const filteredData =
        filteredQualities?.length > 0 ? filteredQualities : data;

      if (!filteredData || filteredData.length === 0) {
        throw new Error('No streams available');
      }

      return filteredData;
    },
    enabled: enabled && !!activeEpisode?.link,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, _error) => {
      if (failureCount >= 2) {
        return false;
      }
      return true;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Update selected stream when data changes
  useEffect(() => {
    if (streamData && streamData.length > 0) {
      setSelectedStream(current => {
        if (!current?.link) return streamData[0];
        // A locally-picked (or auto-resumed) video file will never match an
        // online stream link — that's expected, not staleness. Leave it be.
        if (current?.type === 'local') return current;
        const stillExists = streamData.find(s => s.link === current.link);
        return stillExists ? current : streamData[0];
      });

      // Extract external subtitles
      const subs: any[] = [];
      streamData.forEach(track => {
        if (track?.subtitles?.length && track.subtitles.length > 0) {
          subs.push(...track.subtitles);
        }
      });
      setExternalSubs(subs);
    }
  }, [streamData]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Stream fetch error:', error);
      const errorMessage = error?.message || 'No stream found, try again later';
      ToastAndroid.show(errorMessage, ToastAndroid.SHORT);
    }
  }, [error]);

  const switchToNextStream = () => {
    if (streamData && streamData.length > 0) {
      const currentIndex = streamData.indexOf(selectedStream);
      if (currentIndex < streamData.length - 1) {
        setSelectedStream(streamData[currentIndex + 1]);
        ToastAndroid.show(
          'Video could not be played, Trying next server',
          ToastAndroid.SHORT,
        );
        return true;
      }
    }
    return false;
  };

  return {
    streamData,
    selectedStream,
    setSelectedStream,
    externalSubs,
    setExternalSubs,
    isLoading,
    error,
    refetch,
    switchToNextStream,
  };
};

// Hook for managing video tracks and settings
export const useVideoSettings = () => {
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [textTracks, setTextTracks] = useState<any[]>([]);
  const [videoTracks, setVideoTracks] = useState<any[]>([]);

  const [loadedVideoSize, setLoadedVideoSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [selectedAudioTrackIndex, setSelectedAudioTrackIndex] = useState(0);
  const [selectedTextTrackIndex, setSelectedTextTrackIndex] = useState(1000);
  const [selectedQualityIndex, setSelectedQualityIndex] = useState(1000);

  const processAudioTracks = (tracks: any[]) => {
    const uniqueMap = new Map();
    tracks.forEach(track => {
      const key = `${track.type}-${track.title}-${track.language}`;
      const existingTrack = uniqueMap.get(key);

      if (!existingTrack) {
        uniqueMap.set(key, track);
        return;
      }

      if (track.selected && !existingTrack.selected) {
        uniqueMap.set(key, {...existingTrack, ...track, selected: true});
      }
    });

    const uniqueTracks = Array.from(uniqueMap.values());
    const selectedIndex = uniqueTracks.findIndex(track => track.selected);

    setAudioTracks(uniqueTracks);
    if (selectedIndex !== -1) {
      setSelectedAudioTrackIndex(selectedIndex);
    }
  };

  const processVideoTracks = (tracks: any[]) => {
    if (!tracks || tracks.length === 0) {
      return;
    }
    const uniqueMap = new Map();
    const uniqueTracks = tracks.filter(track => {
      const key = `bitrate-${track.bitrate}-quality ${track.height}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, true);
        return true;
      }
      return false;
    });
    console.log('Processing video tracks:', uniqueTracks);
    setVideoTracks(uniqueTracks);
  };

  const handleVideoLoad = (naturalSize?: {width?: number; height?: number}) => {
    if (!naturalSize?.height) {
      return;
    }
    setLoadedVideoSize({
      width: naturalSize.width ?? 0,
      height: naturalSize.height ?? 0,
    });
  };

  // Clear everything when switching to a new stream/episode.
  const resetVideoTracks = () => {
    setVideoTracks([]);
    setLoadedVideoSize(null);
  };

  const effectiveVideoTracks = useMemo(() => {
    if (videoTracks.length > 0) {
      return videoTracks;
    }
    if (loadedVideoSize?.height) {
      return [
        {
          width: loadedVideoSize.width,
          height: loadedVideoSize.height,
          bitrate: 0,
          codecs: '',
          trackId: '0',
          index: 0,
          rotation: 0,
          selected: true,
        },
      ];
    }
    return videoTracks;
  }, [videoTracks, loadedVideoSize]);

  return {
    audioTracks,
    textTracks,
    videoTracks: effectiveVideoTracks,
    selectedAudioTrackIndex,
    selectedTextTrackIndex,
    selectedQualityIndex,
    setAudioTracks,
    setTextTracks,
    setVideoTracks,
    setSelectedAudioTrackIndex,
    setSelectedTextTrackIndex,
    setSelectedQualityIndex,
    processAudioTracks,
    processVideoTracks,
    handleVideoLoad,
    resetVideoTracks,
  };
};
