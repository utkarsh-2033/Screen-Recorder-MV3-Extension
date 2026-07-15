// Tab capture — acquires a stream from a specific tab using the streamId
// provided by chrome.tabCapture.getMediaStreamId() (called in background SW).
// This mirrors the Loom architecture: tab audio is captured silently.

import { VideoQuality, QUALITY_CONSTRAINTS } from '../../shared/types/recording';
import { createLogger } from '../../shared/utils/logger';

const logger = createLogger('TabCapture');

/**
 * Create a MediaStream from a tab capture stream ID.
 * The streamId is obtained in the background SW via chrome.tabCapture.getMediaStreamId.
 *
 * @param streamId  — from chrome.tabCapture.getMediaStreamId()
 * @param quality   — VideoQuality enum value
 * @returns         — MediaStream containing video + audio tracks from the tab
 */
export async function captureTab(
  streamId: string,
  quality: VideoQuality
): Promise<MediaStream> {
  const { width, height, frameRate } = QUALITY_CONSTRAINTS[quality];

  logger.info('Capturing tab stream', { streamId, quality, width, height });

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      // @ts-expect-error — Chrome-specific mandatory constraints
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        minWidth: width,
        maxWidth: width,
        minHeight: height,
        maxHeight: height,
        maxFrameRate: frameRate,
      },
    },
    audio: {
      // @ts-expect-error — Chrome-specific mandatory constraints
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
  });

  logger.info('Tab stream acquired', {
    videoTracks: stream.getVideoTracks().length,
    audioTracks: stream.getAudioTracks().length,
  });

  return stream;
}
