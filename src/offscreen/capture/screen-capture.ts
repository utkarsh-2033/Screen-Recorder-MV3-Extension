// Screen/Window capture — uses getDisplayMedia() directly in the offscreen context.
// getDisplayMedia() triggers the native Chrome picker, which is the correct
// approach. The old desktopCapture.chooseDesktopMedia streamId expires before
// it can be transferred to the offscreen document via message passing.

import { VideoQuality, QUALITY_CONSTRAINTS } from '../../shared/types/recording';
import { createLogger } from '../../shared/utils/logger';

const logger = createLogger('ScreenCapture');

/**
 * Create a MediaStream from screen/window capture using getDisplayMedia.
 * This is called directly in the offscreen document — Chrome shows its
 * native source picker (tab, window, or screen) to the user.
 *
 * @param quality   — VideoQuality enum value
 * @param mode      — 'screen' | 'window' — passed as preferCurrentTab hint
 * @returns         — MediaStream with video (and possibly audio) tracks
 */
export async function captureDesktop(
  quality: VideoQuality,
  preferWindow = false
): Promise<MediaStream> {
  const { width, height, frameRate } = QUALITY_CONSTRAINTS[quality];

  logger.info('Capturing desktop stream via getDisplayMedia', { quality, width, height, preferWindow });

  const stream = await (navigator.mediaDevices as any).getDisplayMedia({
    video: {
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: frameRate },
      displaySurface: preferWindow ? 'window' : 'monitor',
    },
    audio: {
      // Capture system audio when available (works on Windows/some Chrome versions)
      echoCancellation: false,
      noiseSuppression: false,
      sampleRate: 44100,
    },
  });

  logger.info('Desktop stream acquired', {
    videoTracks: stream.getVideoTracks().length,
    audioTracks: stream.getAudioTracks().length,
  });

  return stream;
}
