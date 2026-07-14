// ─── Recording State Machine ──────────────────────────────────────────────────

export enum RecordingState {
  IDLE = 'IDLE',
  PREPARING = 'PREPARING',
  PERMISSION = 'PERMISSION',   // Waiting for user permission grant
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  RECOVERED = 'RECOVERED',    // Recovered from crash with pending chunks
}

// ─── Recording Mode ──────────────────────────────────────────────────────────

export enum RecordingMode {
  TAB = 'TAB',
  SCREEN = 'SCREEN',
  WINDOW = 'WINDOW',
  CAMERA = 'CAMERA',
  MICROPHONE = 'MICROPHONE',
  CAMERA_AND_SCREEN = 'CAMERA_AND_SCREEN',
  CAMERA_AND_TAB = 'CAMERA_AND_TAB',
}

// ─── Video Quality ────────────────────────────────────────────────────────────

export enum VideoQuality {
  SD_720P = '720p',
  HD_1080P = '1080p',
  QHD_1440P = '1440p',
}

export const QUALITY_CONSTRAINTS: Record<
  VideoQuality,
  { width: number; height: number; frameRate: number }
> = {
  [VideoQuality.SD_720P]: { width: 1280, height: 720, frameRate: 30 },
  [VideoQuality.HD_1080P]: { width: 1920, height: 1080, frameRate: 30 },
  [VideoQuality.QHD_1440P]: { width: 2560, height: 1440, frameRate: 30 },
};

// ─── Recording Session ────────────────────────────────────────────────────────

export interface RecordingSession {
  id: string;
  filename: string;           // e.g. "abc-1234.webm" (mirrors desktop recorder.ts pattern)
  mode: RecordingMode;
  quality: VideoQuality;
  startedAt: number;          // Unix timestamp ms
  pausedAt?: number;
  totalPausedMs: number;
  state: RecordingState;
  chunkCount: number;
  totalBytes: number;
  tabId?: number;             // Source tab (for tab capture mode)
  audioDeviceId?: string;     // Microphone device ID
  includeMic: boolean;
  userId: string;
  uploadProgress: number;     // 0–100
  error?: string;
  retryCount: number;
}

export interface RecordingStateSnapshot {
  state: RecordingState;
  session: RecordingSession | null;
  elapsedMs: number;
}

// ─── Capture Sources ──────────────────────────────────────────────────────────

export interface CaptureSource {
  streamId: string;
  type: 'tab' | 'screen' | 'window';
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: string;
  groupId: string;
}

// ─── Recent Recording (for popup history) ────────────────────────────────────

export interface RecentRecording {
  id: string;
  filename: string;
  duration: number;           // seconds
  completedAt: number;        // Unix timestamp ms
  thumbnailUrl?: string;
  videoUrl?: string;          // Cloudinary URL after upload
  mode: RecordingMode;
}
