import {useCallback, useRef, useState} from 'react';
import {cacheStorage} from '../storage';

interface UsePlayerProgressOptions {
  activeEpisode: any;
  onProgressSaved?: (position: number, duration: number) => void;
}

export const usePlayerProgress = ({
  activeEpisode,
  onProgressSaved,
}: UsePlayerProgressOptions) => {
  const videoPositionRef = useRef({position: 0, duration: 0});
  const lastSavedPositionRef = useRef(0);

  // Memoized progress handler
  const handleProgress = useCallback(
    (e: {currentTime: number; seekableDuration: number}) => {
      const {currentTime, seekableDuration} = e;

      videoPositionRef.current = {
        position: currentTime,
        duration: seekableDuration,
      };

      // Save progress periodically (every 5 seconds)
      if (
        Math.abs(currentTime - lastSavedPositionRef.current) > 5 ||
        currentTime - lastSavedPositionRef.current > 5
      ) {
        cacheStorage.setString(
          activeEpisode.link,
          JSON.stringify({
            position: currentTime,
            duration: seekableDuration,
          }),
        );
        onProgressSaved?.(currentTime, seekableDuration);
        lastSavedPositionRef.current = currentTime;
      }
    },
    [activeEpisode.link, onProgressSaved],
  );

  return {
    videoPositionRef,
    handleProgress,
  };
};

// Hook for player settings and UI state
export const usePlayerSettings = () => {
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'audio' | 'subtitle' | 'server' | 'quality' | 'speed'
  >('audio');
  const [resizeMode, setResizeMode] = useState<any>('none');
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlayerLocked, setIsPlayerLocked] = useState(false);
  const [showUnlockButton, setShowUnlockButton] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(true);

  const unlockButtonTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized resize mode handler
  const handleResizeMode = useCallback(() => {
    const modes = [
      {mode: 'none', name: 'Fit'},
      {mode: 'cover', name: 'Cover'},
      {mode: 'stretch', name: 'Stretch'},
      {mode: 'contain', name: 'Contain'},
    ];
    const index = modes.findIndex(mode => mode.mode === resizeMode);
    const nextMode = modes[(index + 1) % modes.length];
    setResizeMode(nextMode.mode);
    setToast('Resize Mode: ' + nextMode.name, 2000);
  }, [resizeMode]);

  // Memoized toast setter
  const setToast = useCallback((message: string, duration: number) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, duration);
  }, []);

  // Memoized player lock toggle
  const togglePlayerLock = useCallback(() => {
    const newLockState = !isPlayerLocked;
    setIsPlayerLocked(newLockState);

    if (!newLockState) {
      setShowControls(true);
    } else {
      setShowUnlockButton(false);
    }

    if (unlockButtonTimerRef.current) {
      clearTimeout(unlockButtonTimerRef.current);
      unlockButtonTimerRef.current = null;
    }

    setToast(newLockState ? 'Player Locked' : 'Player Unlocked', 2000);
  }, [isPlayerLocked, setToast]);

  // Memoized locked screen tap handler
  const handleLockedScreenTap = useCallback(() => {
    if (showUnlockButton) {
      setShowUnlockButton(false);
      return;
    }

    setShowUnlockButton(true);

    if (unlockButtonTimerRef.current) {
      clearTimeout(unlockButtonTimerRef.current);
    }

    unlockButtonTimerRef.current = setTimeout(() => {
      setShowUnlockButton(false);
    }, 10000);
  }, [showUnlockButton]);

  // Memoized fullscreen toggle
  const toggleFullScreen = useCallback(() => {
    setIsFullScreen(prev => !prev);
  }, []);

  return {
    showControls,
    setShowControls,
    showSettings,
    setShowSettings,
    activeTab,
    setActiveTab,
    resizeMode,
    setResizeMode,
    playbackRate,
    setPlaybackRate,
    isPlayerLocked,
    showUnlockButton,
    toastMessage,
    showToast,
    isTextVisible,
    setIsTextVisible,
    isFullScreen,
    setIsFullScreen,
    handleResizeMode,
    setToast,
    togglePlayerLock,
    toggleFullScreen,
    handleLockedScreenTap,
    unlockButtonTimerRef,
  };
};
