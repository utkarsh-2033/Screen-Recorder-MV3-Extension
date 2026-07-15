// ─── ClipIQ Offscreen Document — Recording Engine ─────────────────────────────
//
// This page runs in a hidden DOM context (created by chrome.offscreen.createDocument).
// It is the ONLY place that can run MediaRecorder and getUserMedia in MV3.
//
// Responsibilities:
//   • Acquire MediaStream based on capture mode (tab/screen/camera/mic)
//   • Mix audio streams (tab audio + microphone)
//   • Run MediaRecorder with 1-second timeslice (matching desktop app)
//   • Connect Socket.IO to the same server as the desktop app
//   • Emit video-chunks on each dataavailable event
//   • Emit process-video on stop (server handles Cloudinary + DB)
//   • Report chunk progress back to background SW
//

import { io, type Socket } from 'socket.io-client';
import { v4 as uuid } from 'uuid';
import { MSG, type ExtensionMessage, type StartCapturePayload } from '../shared/types/messages';
import { RecordingMode, type VideoQuality } from '../shared/types/recording';
import { CONFIG } from '../shared/constants/config';
import { createLogger } from '../shared/utils/logger';
import { parseMessage } from '../shared/utils/validation';
import { captureTab } from './capture/tab-capture';
import { captureDesktop } from './capture/screen-capture';
import { captureCamera, captureMicrophone } from './capture/camera-capture';
import { mixAudioStreams, getMicrophoneStream } from './audio/mixer';
import { storeChunk, getChunksForFile, deleteChunksForFile } from './indexed-db';

const logger = createLogger('Offscreen');

// ─── State ────────────────────────────────────────────────────────────────────

let mediaRecorder: MediaRecorder | null = null;
let activeStream: MediaStream | null = null;
let socket: Socket | null = null;
let currentFilename: string | null = null;
let currentUserId: string | null = null;
let chunkIndex = 0;
let isPaused = false;
let audioMixerCleanup: (() => void) | null = null;

// ─── Socket.IO — mirrors desktop app's recorder.ts exactly ───────────────────

function connectSocket(): Socket {
  if (socket?.connected) return socket;

  logger.info('Connecting to socket server', { url: CONFIG.SOCKET_URL });

  const s = io(CONFIG.SOCKET_URL, {
    transports: ['websocket'],  // Avoid long-polling in extension context
    reconnection: true,
    reconnectionAttempts: CONFIG.SOCKET_RECONNECT_ATTEMPTS,
    reconnectionDelay: CONFIG.SOCKET_RECONNECT_DELAY_MS,
    timeout: 10000,
  });

  s.on('connect', async () => {
    logger.info('Socket connected', { id: s.id });
    // Flush any pending chunks for the current recording
    if (currentFilename) {
      try {
        const pendingChunks = await getChunksForFile(currentFilename);
        if (pendingChunks.length > 0) {
          logger.info(`Flushing ${pendingChunks.length} chunks from IndexedDB`);
          for (const chunk of pendingChunks) {
            s.emit('video-chunks', {
              chunks: new Blob([chunk.data], { type: 'video/webm' }),
              filename: chunk.filename,
            });
          }
          await deleteChunksForFile(currentFilename);
          
          // If the recording was stopped while offline, trigger the process-video now
          if (mediaRecorder?.state === 'inactive' && chunkIndex > 0) {
            onStop(); 
          }
        }
      } catch (err) {
        logger.error('Failed to flush offline chunks', err);
      }
    }
  });

  s.on('disconnect', (reason) => {
    logger.warn('Socket disconnected', { reason });
  });

  s.on('upload-error', (data: { message: string }) => {
    logger.error('Server upload error', data);
    chrome.runtime.sendMessage({
      type: MSG.CAPTURE_ERROR,
      payload: { code: 'UPLOAD_ERROR', message: data.message },
    } as ExtensionMessage).catch(() => {});
  });

  socket = s;
  return s;
}

function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    logger.debug('Socket disconnected');
  }
}

// ─── Emit chunk — mirrors desktop app's onDataAvailable ──────────────────────

function onDataAvailable(event: BlobEvent): void {
  if (event.data.size === 0 || !currentFilename || isPaused) return;

  logger.debug('Chunk available', { size: event.data.size, chunkIndex });

  const s = connectSocket();

  if (s.connected) {
    // Emit exactly like the desktop app's recorder.ts
    s.emit('video-chunks', {
      chunks: event.data,        // Blob — socket.io handles serialization
      filename: currentFilename,
    });
  } else {
    // Socket offline, save to IndexedDB to avoid in-memory queue OOM
    logger.debug('Socket offline — storing chunk in IndexedDB');
    event.data.arrayBuffer().then((buffer) => {
      storeChunk({
        filename: currentFilename!,
        chunkIndex,
        data: buffer,
        timestamp: Date.now(),
      }).catch(err => logger.error('IndexedDB store failed', err));
    });
  }

  chunkIndex++;

  // Notify background of chunk progress
  chrome.runtime.sendMessage({
    type: MSG.CHUNK_READY,
    payload: {
      chunkIndex: chunkIndex - 1,
      size: event.data.size,
      filename: currentFilename,
    },
  } as ExtensionMessage).catch(() => {});
}

// ─── Stop recording — mirrors desktop app's stopRecording ────────────────────

function onStop(): void {
  logger.info('MediaRecorder stopped', {
    filename: currentFilename,
    totalChunks: chunkIndex,
    userId: currentUserId,
  });

  if (currentFilename && currentUserId) {
    const s = connectSocket();

    if (!s.connected) {
      logger.info('Socket disconnected during stop. process-video will be triggered upon reconnection.');
      
      // We must STILL notify the background so the UI transitions to UPLOADING!
      chrome.runtime.sendMessage({
        type: MSG.CAPTURE_STOPPED,
        payload: {
          filename: currentFilename,
          totalChunks: chunkIndex,
          duration: 0,
        },
      }).catch(() => {});
      
      // Do NOT call cleanupStreams() yet, because the reconnect listener
      // needs currentFilename to call onStop() again and emit process-video.
      return;
    }

    // Emit exactly like the desktop app's recorder.ts
    s.emit('process-video', {
      filename: currentFilename,
      userId: currentUserId,
    });

    logger.info('Emitted process-video', { filename: currentFilename });

    // Notify background that capture has stopped
    chrome.runtime.sendMessage({
      type: MSG.CAPTURE_STOPPED,
      payload: {
        filename: currentFilename,
        totalChunks: chunkIndex,
        duration: 0, // Background calculates duration from session start time
      },
    } as ExtensionMessage).catch(() => {});

    // Monitor for upload completion via a pseudo-progress ping
    // The server processes asynchronously; we simulate progress then report complete
    let progress = 10;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + 15, 95);
      chrome.runtime.sendMessage({
        type: MSG.UPLOAD_PROGRESS,
        payload: { percent: progress },
      } as ExtensionMessage).catch(() => {});
    }, 1500);

    // After ~12 seconds, assume upload is complete (server is async)
    setTimeout(() => {
      clearInterval(progressInterval);
      chrome.runtime.sendMessage({
        type: MSG.UPLOAD_COMPLETE,
      } as ExtensionMessage).catch(() => {});
      disconnectSocket();
    }, 12000);
  }

  // Cleanup streams
  cleanupStreams();
}

function cleanupStreams(): void {
  if (activeStream) {
    activeStream.getTracks().forEach((track) => {
      track.stop();
      logger.debug('Track stopped', { kind: track.kind, label: track.label });
    });
    activeStream = null;
  }

  if (audioMixerCleanup) {
    audioMixerCleanup();
    audioMixerCleanup = null;
  }

  chunkIndex = 0;
  currentFilename = null;
  currentUserId = null;
  isPaused = false;
  mediaRecorder = null;
}

// ─── Start Recording ──────────────────────────────────────────────────────────

async function startCapture(payload: StartCapturePayload): Promise<void> {
  const { mode, quality, streamId, preferWindow, audioDeviceId, includeMic, filename, userId } = payload;

  logger.info('Starting capture', { mode, quality, filename, userId });

  currentFilename = filename;
  currentUserId = userId;
  chunkIndex = 0;

  let videoStream: MediaStream;
  let micStream: MediaStream | null = null;
  let combinedStream: MediaStream;

  try {
    // Acquire primary stream based on mode
    switch (mode) {
      case RecordingMode.TAB:
      case RecordingMode.CAMERA_AND_TAB: {
        if (!streamId) throw new Error('streamId required for tab capture');
        videoStream = await captureTab(streamId, quality as VideoQuality);
        break;
      }

      case RecordingMode.SCREEN:
      case RecordingMode.WINDOW:
      case RecordingMode.CAMERA_AND_SCREEN: {
        // getDisplayMedia is called directly here — Chrome shows its native picker.
        // No streamId needed (and using one would expire before it reaches this context).
        videoStream = await captureDesktop(quality as VideoQuality, preferWindow ?? false);
        break;
      }

      case RecordingMode.CAMERA: {
        videoStream = await captureCamera(audioDeviceId);
        break;
      }

      case RecordingMode.MICROPHONE: {
        videoStream = await captureMicrophone(audioDeviceId);
        break;
      }

      default:
        throw new Error(`Unsupported recording mode: ${mode}`);
    }

    // Acquire microphone if requested (for modes that don't have it built in)
    if (
      includeMic &&
      (mode === RecordingMode.TAB ||
        mode === RecordingMode.SCREEN ||
        mode === RecordingMode.WINDOW ||
        mode === RecordingMode.CAMERA_AND_SCREEN ||
        mode === RecordingMode.CAMERA_AND_TAB)
    ) {
      micStream = await getMicrophoneStream(audioDeviceId);
    }

    // Mix audio if we have both streams
    if (micStream && videoStream.getAudioTracks().length > 0) {
      const mixResult = await mixAudioStreams(videoStream, micStream);
      audioMixerCleanup = mixResult.cleanup;

      // Build combined stream: video from primary + mixed audio
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        mixResult.audioTrack,
      ]);

      // Stop the raw mic stream since we're using the mixed track
      micStream.getTracks().forEach((t) => t.stop());
    } else if (micStream) {
      // No tab audio to mix — just add mic tracks alongside video
      combinedStream = new MediaStream([
        ...videoStream.getTracks(),
        ...micStream.getTracks(),
      ]);
    } else {
      combinedStream = videoStream;
    }

    activeStream = combinedStream;

    // Initialize MediaRecorder — matches desktop app's recorder.ts exactly
    const mimeType = CONFIG.CODEC; // 'video/webm; codecs=vp9'
    mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : 'video/webm',         // Fallback if vp9 not available
    });

    mediaRecorder.ondataavailable = onDataAvailable;
    mediaRecorder.onstop = onStop;

    mediaRecorder.onerror = (event) => {
      logger.error('MediaRecorder error', event);
      chrome.runtime.sendMessage({
        type: MSG.CAPTURE_ERROR,
        payload: {
          code: 'MEDIA_RECORDER_ERROR',
          message: 'MediaRecorder encountered an error',
        },
      } as ExtensionMessage).catch(() => {});
    };

    // Pre-connect socket to reduce latency on first chunk
    connectSocket();

    // Start recording with 1-second timeslice — matches desktop app
    mediaRecorder.start(CONFIG.CHUNK_INTERVAL_MS);

    logger.info('MediaRecorder started', {
      mimeType: mediaRecorder.mimeType,
      state: mediaRecorder.state,
    });

    // Notify background that capture has started
    chrome.runtime.sendMessage({
      type: MSG.CAPTURE_STARTED,
      payload: { filename },
    } as ExtensionMessage).catch(() => {});
  } catch (err) {
    logger.error('Failed to start capture', err);
    cleanupStreams();
    disconnectSocket();
    chrome.runtime.sendMessage({
      type: MSG.CAPTURE_ERROR,
      payload: {
        code: 'CAPTURE_FAILED',
        message: err instanceof Error ? err.message : 'Unknown capture error',
      },
    } as ExtensionMessage).catch(() => {});
  }
}

// ─── Message Router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((rawMessage: unknown) => {
  const msg = parseMessage(rawMessage);
  if (!msg) return false;

  switch (msg.type) {
    case MSG.START_CAPTURE:
      startCapture(msg.payload).catch((err) => logger.error('startCapture error', err));
      break;

    case MSG.STOP_CAPTURE:
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        isPaused = false;
        mediaRecorder.stop();
      } else {
        logger.warn('STOP_CAPTURE received but recorder is not active');
      }
      break;

    case MSG.PAUSE_CAPTURE:
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        isPaused = true;
        chrome.runtime.sendMessage({ type: MSG.CAPTURE_PAUSED } as ExtensionMessage).catch(() => {});
        logger.info('Recording paused');
      }
      break;

    case MSG.RESUME_CAPTURE:
      if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        isPaused = false;
        chrome.runtime.sendMessage({ type: MSG.CAPTURE_RESUMED } as ExtensionMessage).catch(() => {});
        logger.info('Recording resumed');
      }
      break;

    default:
      break;
  }

  return false;
});

logger.info('Offscreen document loaded — recording engine ready');
