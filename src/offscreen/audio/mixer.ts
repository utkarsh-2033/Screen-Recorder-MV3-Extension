// AudioContext mixer — combines tab/system audio with microphone audio.
// Mirrors the mixing pattern from the deep-research-report.md.

import { createLogger } from '../../shared/utils/logger';

const logger = createLogger('AudioMixer');

export interface MixedAudioResult {
  audioTrack: MediaStreamTrack;
  context: AudioContext;
  cleanup: () => void;
}

/**
 * Mix two audio streams (e.g., tab audio + microphone) into a single audio track.
 * Uses the Web Audio API AudioContext approach from the Loom architecture research.
 */
export async function mixAudioStreams(
  primaryStream: MediaStream,     // Screen/tab stream (may contain audio)
  micStream: MediaStream | null   // Microphone stream (optional)
): Promise<MixedAudioResult> {
  const context = new AudioContext();
  const destination = context.createMediaStreamDestination();

  const sources: AudioNode[] = [];

  // Connect primary (screen/tab) audio if present
  const primaryAudioTracks = primaryStream.getAudioTracks();
  if (primaryAudioTracks.length > 0) {
    const primaryAudio = new MediaStream(primaryAudioTracks);
    const primarySource = context.createMediaStreamSource(primaryAudio);
    primarySource.connect(destination);
    sources.push(primarySource);
    logger.debug('Connected primary audio to mixer', { tracks: primaryAudioTracks.length });
  }

  // Connect microphone audio if present
  if (micStream) {
    const micAudioTracks = micStream.getAudioTracks();
    if (micAudioTracks.length > 0) {
      const micSource = context.createMediaStreamSource(micStream);
      micSource.connect(destination);
      sources.push(micSource);
      logger.debug('Connected microphone to mixer', { tracks: micAudioTracks.length });
    }
  }

  const mixedAudioTrack = destination.stream.getAudioTracks()[0];

  const cleanup = () => {
    sources.forEach((s) => {
      try {
        s.disconnect();
      } catch {
        // Already disconnected
      }
    });
    context.close().catch(() => {});
    logger.debug('Audio mixer cleaned up');
  };

  return { audioTrack: mixedAudioTrack, context, cleanup };
}

/**
 * Acquire microphone stream for a specific device.
 */
export async function getMicrophoneStream(deviceId?: string): Promise<MediaStream | null> {
  try {
    const constraints: MediaStreamConstraints = {
      video: false,
      audio: deviceId
        ? { deviceId: { exact: deviceId } }
        : true,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    logger.info('Microphone stream acquired', { deviceId });
    return stream;
  } catch (err) {
    logger.warn('Could not acquire microphone', err);
    return null;
  }
}
