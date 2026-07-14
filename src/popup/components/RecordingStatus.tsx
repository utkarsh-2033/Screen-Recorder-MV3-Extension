import { RecordingState } from '../../shared/types/recording';
import { formatDuration } from '../../shared/utils/validation';

interface RecordingStatusProps {
  state: RecordingState;
  elapsedMs: number;
  uploadProgress: number;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

const STATE_CONFIG: Partial<
  Record<RecordingState, { label: string; color: string; badge: string }>
> = {
  [RecordingState.RECORDING]: {
    label: 'Recording',
    color: 'var(--red)',
    badge: 'badge-red',
  },
  [RecordingState.PAUSED]: {
    label: 'Paused',
    color: 'var(--amber)',
    badge: 'badge-amber',
  },
  [RecordingState.UPLOADING]: {
    label: 'Uploading',
    color: 'var(--blue)',
    badge: 'badge-blue',
  },
  [RecordingState.UPLOADED]: {
    label: 'Uploaded ✓',
    color: 'var(--green)',
    badge: 'badge-green',
  },
};

export function RecordingStatus({
  state,
  elapsedMs,
  uploadProgress,
  onStop,
  onPause,
  onResume,
  onCancel,
}: RecordingStatusProps) {
  const config = STATE_CONFIG[state];
  const isRecording = state === RecordingState.RECORDING;
  const isPaused = state === RecordingState.PAUSED;
  const isUploading = state === RecordingState.UPLOADING;
  const isUploaded = state === RecordingState.UPLOADED;
  const isActive = isRecording || isPaused;

  return (
    <div className={`rec-status animate-slide-up ${isRecording ? 'rec-status--recording' : ''}`}>
      {/* Status header */}
      <div className="rec-status__header">
        {isRecording && (
          <div className="rec-dot-wrap">
            <div className="rec-dot" />
            <div className="rec-dot-ripple" />
          </div>
        )}

        <span className={`badge ${config?.badge ?? 'badge-purple'}`}>
          {config?.label ?? state}
        </span>

        {isActive && (
          <span className="rec-status__timer">
            {formatDuration(elapsedMs)}
          </span>
        )}
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div className="rec-status__upload">
          <div className="rec-status__upload-label">
            <span className="text-secondary text-xs">Uploading to ClipIQ…</span>
            <span className="text-xs font-semibold">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {isUploaded && (
        <p className="rec-status__success">
          🎉 Your recording is ready! Check your dashboard for the processed video.
        </p>
      )}

      {/* Controls */}
      {isActive && (
        <div className="rec-status__controls">
          {isRecording && (
            <button className="btn btn-ghost btn-sm" onClick={onPause} id="btn-pause">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="2" width="3.5" height="10" rx="1" fill="currentColor" />
                <rect x="8.5" y="2" width="3.5" height="10" rx="1" fill="currentColor" />
              </svg>
              Pause
            </button>
          )}

          {isPaused && (
            <button className="btn btn-ghost btn-sm" onClick={onResume} id="btn-resume">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 2l9 5-9 5V2z" fill="currentColor" />
              </svg>
              Resume
            </button>
          )}

          <button className="btn btn-destructive btn-sm" onClick={onStop} id="btn-stop">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor" />
            </svg>
            Stop
          </button>

          <button
            className="btn-icon"
            onClick={onCancel}
            title="Cancel recording"
            id="btn-cancel"
            style={{ marginLeft: 'auto' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      <style>{`
        .rec-status {
          margin: 12px 16px;
          padding: 14px;
          background: var(--bg-card);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: border-color var(--transition-base);
        }
        .rec-status--recording {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.05);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.08);
        }
        .rec-status__header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rec-status__timer {
          font-family: var(--font-mono);
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin-left: auto;
          letter-spacing: 1px;
        }
        .rec-dot-wrap {
          position: relative;
          width: 12px;
          height: 12px;
          flex-shrink: 0;
        }
        .rec-dot {
          width: 10px;
          height: 10px;
          background: var(--red);
          border-radius: 50%;
          animation: pulse-red 1.5s infinite;
          position: absolute;
          top: 1px;
          left: 1px;
        }
        .rec-dot-ripple {
          position: absolute;
          top: 0;
          left: 0;
          width: 12px;
          height: 12px;
          background: var(--red);
          border-radius: 50%;
          animation: ripple 1.5s infinite;
          opacity: 0.4;
        }
        .rec-status__upload {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rec-status__upload-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rec-status__success {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .rec-status__controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
