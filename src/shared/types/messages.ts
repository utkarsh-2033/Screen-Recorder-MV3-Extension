// ─── Extension Message Type Contracts ────────────────────────────────────────
//
// Every message between popup ↔ background ↔ offscreen ↔ content is
// expressed as a discriminated union. No magic strings anywhere.
//

import type { RecordingMode, RecordingState, RecordingStateSnapshot, VideoQuality } from './recording';
import type { ExtensionUser } from './user';

// ── Message Type Literals ────────────────────────────────────────────────────

export const MSG = {
  // Popup → Background
  START_RECORDING: 'START_RECORDING',
  STOP_RECORDING: 'STOP_RECORDING',
  PAUSE_RECORDING: 'PAUSE_RECORDING',
  RESUME_RECORDING: 'RESUME_RECORDING',
  CANCEL_RECORDING: 'CANCEL_RECORDING',
  GET_STATE: 'GET_STATE',
  GET_AUTH: 'GET_AUTH',
  OPEN_AUTH_PAGE: 'OPEN_AUTH_PAGE',
  LOGOUT: 'LOGOUT',
  GET_RECENT_RECORDINGS: 'GET_RECENT_RECORDINGS',
  GET_AUDIO_DEVICES: 'GET_AUDIO_DEVICES',
  OPEN_DASHBOARD: 'OPEN_DASHBOARD',

  // Background → Offscreen
  START_CAPTURE: 'START_CAPTURE',
  STOP_CAPTURE: 'STOP_CAPTURE',
  PAUSE_CAPTURE: 'PAUSE_CAPTURE',
  RESUME_CAPTURE: 'RESUME_CAPTURE',

  // Offscreen → Background
  CAPTURE_STARTED: 'CAPTURE_STARTED',
  CHUNK_READY: 'CHUNK_READY',
  CAPTURE_STOPPED: 'CAPTURE_STOPPED',
  CAPTURE_PAUSED: 'CAPTURE_PAUSED',
  CAPTURE_RESUMED: 'CAPTURE_RESUMED',
  CAPTURE_ERROR: 'CAPTURE_ERROR',
  UPLOAD_PROGRESS: 'UPLOAD_PROGRESS',
  UPLOAD_COMPLETE: 'UPLOAD_COMPLETE',

  // Background → Content Script
  SHOW_CONTROLS: 'SHOW_CONTROLS',
  HIDE_CONTROLS: 'HIDE_CONTROLS',
  UPDATE_TIMER: 'UPDATE_TIMER',
  RECORDING_COMPLETE_NOTIFY: 'RECORDING_COMPLETE_NOTIFY',

  // Auth Bridge (externally_connectable)
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_ERROR: 'AUTH_ERROR',

  // Background → Popup (via sendMessage or port)
  STATE_UPDATE: 'STATE_UPDATE',
  AUTH_UPDATE: 'AUTH_UPDATE',
} as const;

export type MsgType = (typeof MSG)[keyof typeof MSG];

// ── Payload Shapes ────────────────────────────────────────────────────────────

export interface StartRecordingPayload {
  mode: RecordingMode;
  quality: VideoQuality;
  audioDeviceId?: string;
  includeMic: boolean;
}

export interface StartCapturePayload {
  mode: RecordingMode;
  quality: VideoQuality;
  streamId?: string;        // For tab capture only (from tabCapture.getMediaStreamId)
  preferWindow?: boolean;   // For screen capture: true = window picker, false = full screen picker
  audioDeviceId?: string;
  includeMic: boolean;
  filename: string;
  userId: string;
}

export interface ChunkReadyPayload {
  chunkIndex: number;
  size: number;
  filename: string;
}

export interface CaptureStoppedPayload {
  filename: string;
  totalChunks: number;
  duration: number;
}

export interface CaptureErrorPayload {
  code: string;
  message: string;
}

export interface UploadProgressPayload {
  percent: number;
}

export interface ShowControlsPayload {
  state: RecordingState;
  mode?: RecordingMode;
  audioDeviceId?: string;
}

export interface UpdateTimerPayload {
  elapsedMs: number;
}

export interface AuthSuccessPayload {
  userId: string;
  token: string;
  expiresAt: number;
  user: ExtensionUser;
}

export interface StateUpdatePayload {
  snapshot: RecordingStateSnapshot;
}

export interface AuthUpdatePayload {
  authenticated: boolean;
  user: ExtensionUser | null;
}

// ── Discriminated Union ───────────────────────────────────────────────────────

export type ExtensionMessage =
  | { type: typeof MSG.START_RECORDING; payload: StartRecordingPayload }
  | { type: typeof MSG.STOP_RECORDING }
  | { type: typeof MSG.PAUSE_RECORDING }
  | { type: typeof MSG.RESUME_RECORDING }
  | { type: typeof MSG.CANCEL_RECORDING }
  | { type: typeof MSG.GET_STATE }
  | { type: typeof MSG.GET_AUTH }
  | { type: typeof MSG.OPEN_AUTH_PAGE }
  | { type: typeof MSG.LOGOUT }
  | { type: typeof MSG.GET_RECENT_RECORDINGS }
  | { type: typeof MSG.GET_AUDIO_DEVICES }
  | { type: typeof MSG.OPEN_DASHBOARD }
  | { type: typeof MSG.START_CAPTURE; payload: StartCapturePayload }
  | { type: typeof MSG.STOP_CAPTURE }
  | { type: typeof MSG.PAUSE_CAPTURE }
  | { type: typeof MSG.RESUME_CAPTURE }
  | { type: typeof MSG.CAPTURE_STARTED; payload: { filename: string } }
  | { type: typeof MSG.CHUNK_READY; payload: ChunkReadyPayload }
  | { type: typeof MSG.CAPTURE_STOPPED; payload: CaptureStoppedPayload }
  | { type: typeof MSG.CAPTURE_PAUSED }
  | { type: typeof MSG.CAPTURE_RESUMED }
  | { type: typeof MSG.CAPTURE_ERROR; payload: CaptureErrorPayload }
  | { type: typeof MSG.UPLOAD_PROGRESS; payload: UploadProgressPayload }
  | { type: typeof MSG.UPLOAD_COMPLETE }
  | { type: typeof MSG.SHOW_CONTROLS; payload: ShowControlsPayload }
  | { type: typeof MSG.HIDE_CONTROLS }
  | { type: typeof MSG.UPDATE_TIMER; payload: UpdateTimerPayload }
  | { type: typeof MSG.RECORDING_COMPLETE_NOTIFY }
  | { type: typeof MSG.AUTH_SUCCESS; payload: AuthSuccessPayload }
  | { type: typeof MSG.AUTH_ERROR; payload: { message: string } }
  | { type: typeof MSG.STATE_UPDATE; payload: StateUpdatePayload }
  | { type: typeof MSG.AUTH_UPDATE; payload: AuthUpdatePayload };

// Helper to narrow message type
export function isMessage(msg: unknown): msg is ExtensionMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg;
}
