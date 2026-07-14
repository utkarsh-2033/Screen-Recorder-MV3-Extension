// Hook for polling recording state from background SW
// Uses sendMessage with a 1-second polling interval as a simple, reliable approach.

import { useState, useEffect, useCallback } from 'react';
import { MSG } from '../../shared/types/messages';
import { RecordingState, type RecordingStateSnapshot } from '../../shared/types/recording';
import { VideoQuality, RecordingMode } from '../../shared/types/recording';

const IDLE_SNAPSHOT: RecordingStateSnapshot = {
  state: RecordingState.IDLE,
  session: null,
  elapsedMs: 0,
};

export function useRecordingState() {
  const [snapshot, setSnapshot] = useState<RecordingStateSnapshot>(IDLE_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const result = await chrome.runtime.sendMessage({ type: MSG.GET_STATE });
      if (result) {
        setSnapshot(result as RecordingStateSnapshot);
        setError(null);
      }
    } catch (err) {
      // Background SW may be waking up — not a hard error
      setError('Connecting to background…');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Also listen for push updates from background
  useEffect(() => {
    const listener = (msg: unknown) => {
      if (
        typeof msg === 'object' &&
        msg !== null &&
        'type' in msg &&
        (msg as { type: string }).type === MSG.STATE_UPDATE
      ) {
        const payload = (msg as any as { payload: { snapshot: RecordingStateSnapshot } }).payload;
        setSnapshot(payload.snapshot);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const startRecording = useCallback(
    async (mode: RecordingMode, quality: VideoQuality, audioDeviceId?: string, includeMic = true) => {
      const needsCamera = mode === RecordingMode.CAMERA || mode === RecordingMode.CAMERA_AND_SCREEN || mode === RecordingMode.CAMERA_AND_TAB;
      const needsMic = includeMic || mode === RecordingMode.MICROPHONE || needsCamera;

      if (needsCamera || needsMic) {
        try {
          let cameraGranted = true;
          let micGranted = true;

          if (needsCamera) {
            const camPerm = await navigator.permissions.query({ name: 'camera' as any });
            cameraGranted = camPerm.state === 'granted';
          }
          if (needsMic) {
            const micPerm = await navigator.permissions.query({ name: 'microphone' as any });
            micGranted = micPerm.state === 'granted';
          }

          if (!cameraGranted || !micGranted) {
            // Permissions are missing. Do NOT prompt here because Chrome closes the popup!
            // Route to options page to prompt gracefully.
            chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/options/options.html?requestPermissions=true') });
            return { success: false, error: 'Permissions required. Redirecting to Options page...' };
          }
        } catch (err: any) {
          // Fallback if permissions.query fails, but this shouldn't happen in Chrome
          return { success: false, error: 'Failed to verify camera/mic permissions.' };
        }
      }

      const result = await chrome.runtime.sendMessage({
        type: MSG.START_RECORDING,
        payload: { mode, quality, audioDeviceId, includeMic },
      });
      return result as { success: boolean; error?: string };
    },
    []
  );

  const stopRecording = useCallback(async () => {
    return chrome.runtime.sendMessage({ type: MSG.STOP_RECORDING });
  }, []);

  const pauseRecording = useCallback(async () => {
    return chrome.runtime.sendMessage({ type: MSG.PAUSE_RECORDING });
  }, []);

  const resumeRecording = useCallback(async () => {
    return chrome.runtime.sendMessage({ type: MSG.RESUME_RECORDING });
  }, []);

  const cancelRecording = useCallback(async () => {
    return chrome.runtime.sendMessage({ type: MSG.CANCEL_RECORDING });
  }, []);

  return {
    snapshot,
    isLoading,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
}
