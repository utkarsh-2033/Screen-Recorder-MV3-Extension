// Recording coordinator — manages the offscreen document lifecycle and
// routes recording commands from background.ts to the offscreen engine.
// Mirrors the desktop app's main.ts IPC pattern.

import { CONFIG } from '../../shared/constants/config';
import { MSG, type ExtensionMessage, type StartCapturePayload } from '../../shared/types/messages';
import { RecordingMode, RecordingState, type RecordingSession, VideoQuality } from '../../shared/types/recording';
import { createLogger } from '../../shared/utils/logger';
import { generateFilename } from '../../shared/utils/validation';

const logger = createLogger('Coordinator');

const OFFSCREEN_URL = () => chrome.runtime.getURL(CONFIG.OFFSCREEN_HTML);

// ─── Offscreen Document Management ───────────────────────────────────────────

async function ensureOffscreenDocument(): Promise<void> {
  const url = OFFSCREEN_URL();
  let existingContexts: chrome.runtime.ExtensionContext[] = [];

  try {
    existingContexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      documentUrls: [url],
    });
  } catch {
    // getContexts may not be available in all Chrome versions
    existingContexts = [];
  }

  if (existingContexts.length === 0) {
    logger.info('Creating offscreen document');
    await chrome.offscreen.createDocument({
      url,
      reasons: [
        chrome.offscreen.Reason.USER_MEDIA,
        chrome.offscreen.Reason.DISPLAY_MEDIA,
        chrome.offscreen.Reason.AUDIO_PLAYBACK,
      ],
      justification: 'Screen and audio recording for ClipIQ',
    });
    logger.info('Offscreen document created');
  } else {
    logger.debug('Offscreen document already exists');
  }
}

async function closeOffscreenDocument(): Promise<void> {
  try {
    await chrome.offscreen.closeDocument();
    logger.info('Offscreen document closed');
  } catch (err) {
    logger.warn('Could not close offscreen document', err);
  }
}

async function sendToOffscreen(message: ExtensionMessage): Promise<void> {
  try {
    await chrome.runtime.sendMessage(message);
  } catch (err) {
    logger.error('Failed to send message to offscreen', { message: message.type, err });
    throw err;
  }
}

// ─── Tab Capture Helper ───────────────────────────────────────────────────────

async function getTabCaptureStreamId(tabId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId(
      { targetTabId: tabId },
      (streamId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(streamId);
        }
      }
    );
  });
}

// ─── Screen/Window Capture Helper ────────────────────────────────────────────
// NOTE: Screen capture now happens directly in the offscreen document via
// getDisplayMedia(). No streamId is acquired in the background SW for these modes.
// The background only sets a preferWindow flag to guide the offscreen picker.

// ─── Main Recording Coordinator ───────────────────────────────────────────────

export class RecordingCoordinator {
  async startRecording(
    mode: RecordingMode,
    quality: VideoQuality,
    audioDeviceId: string | undefined,
    includeMic: boolean,
    userId: string,
    activeTab: chrome.tabs.Tab
  ): Promise<RecordingSession> {
    logger.info('Starting recording', { mode, quality, userId });

    const filename = generateFilename(userId);
    let streamId: string | undefined;
    let preferWindow = false;

    // Acquire stream ID based on mode
    if ((mode === RecordingMode.TAB || mode === RecordingMode.CAMERA_AND_TAB) && activeTab.id) {
      logger.info('Acquiring tab capture stream');
      streamId = await getTabCaptureStreamId(activeTab.id);
    } else if (mode === RecordingMode.WINDOW) {
      // Window mode: tell offscreen to show the window picker via getDisplayMedia
      preferWindow = true;
      logger.info('Screen/Window capture: offscreen will call getDisplayMedia');
    } else if (mode === RecordingMode.SCREEN || mode === RecordingMode.CAMERA_AND_SCREEN) {
      // Screen/PiP mode: offscreen will call getDisplayMedia with screen hint
      logger.info('Screen capture: offscreen will call getDisplayMedia');
    }
    // CAMERA, MICROPHONE: no streamId needed, offscreen uses getUserMedia directly

    // Ensure offscreen document exists
    await ensureOffscreenDocument();

    // Tell offscreen to start capturing
    const capturePayload: StartCapturePayload = {
      mode,
      quality,
      streamId,
      preferWindow,
      audioDeviceId,
      includeMic,
      filename,
      userId,
    };

    await sendToOffscreen({
      type: MSG.START_CAPTURE,
      payload: capturePayload,
    });

    const session: RecordingSession = {
      id: crypto.randomUUID(),
      filename,
      mode,
      quality,
      startedAt: Date.now(),
      totalPausedMs: 0,
      state: RecordingState.RECORDING,
      chunkCount: 0,
      totalBytes: 0,
      tabId: activeTab.id,
      audioDeviceId,
      includeMic,
      userId,
      uploadProgress: 0,
      retryCount: 0,
    };

    logger.info('Recording session created', { sessionId: session.id, filename });
    return session;
  }

  async stopRecording(): Promise<void> {
    logger.info('Stopping recording');
    await sendToOffscreen({ type: MSG.STOP_CAPTURE });
  }

  async pauseRecording(): Promise<void> {
    logger.info('Pausing recording');
    await sendToOffscreen({ type: MSG.PAUSE_CAPTURE });
  }

  async resumeRecording(): Promise<void> {
    logger.info('Resuming recording');
    await sendToOffscreen({ type: MSG.RESUME_CAPTURE });
  }

  async cleanupOffscreen(): Promise<void> {
    await closeOffscreenDocument();
  }
}

export const coordinator = new RecordingCoordinator();
