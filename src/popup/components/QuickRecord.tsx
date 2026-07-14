import { RecordingMode, RecordingState } from '../../shared/types/recording';

interface QuickRecordProps {
  mode: RecordingMode;
  isDisabled: boolean;
  onStartRecording: () => void;
}

const MODE_LABELS: Record<RecordingMode, string> = {
  [RecordingMode.TAB]: 'Record Tab',
  [RecordingMode.SCREEN]: 'Record Screen',
  [RecordingMode.WINDOW]: 'Record Window',
  [RecordingMode.CAMERA]: 'Start Camera',
  [RecordingMode.MICROPHONE]: 'Record Audio',
  [RecordingMode.CAMERA_AND_SCREEN]: 'Record with Camera',
  [RecordingMode.CAMERA_AND_TAB]: 'Record Tab + Camera',
};

export function QuickRecord({ mode, isDisabled, onStartRecording }: QuickRecordProps) {
  return (
    <div className="quick-record">
      <button
        id="btn-start-recording"
        className="record-btn"
        onClick={onStartRecording}
        disabled={isDisabled}
        aria-label={MODE_LABELS[mode]}
      >
        <div className="record-btn__dot" />
        <span className="record-btn__label">{MODE_LABELS[mode]}</span>
        <div className="record-btn__glow" />
      </button>

      <style>{`
        .quick-record {
          padding: 14px 16px 16px;
        }

        .record-btn {
          width: 100%;
          height: 52px;
          border: none;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--purple) 0%, #9333ea 100%);
          color: white;
          font-family: var(--font-sans);
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
          transition: all var(--transition-base);
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
          letter-spacing: -0.2px;
        }

        .record-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 28px rgba(124, 58, 237, 0.55);
          background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
        }

        .record-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 12px rgba(124, 58, 237, 0.4);
        }

        .record-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .record-btn__dot {
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
        }

        .record-btn__label {
          position: relative;
          z-index: 1;
        }

        /* Shimmer overlay */
        .record-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 200%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.12) 50%,
            transparent 100%
          );
          transition: left 0.6s ease;
        }
        .record-btn:hover::before {
          left: 100%;
        }

        .record-btn__glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 50% 50%,
            rgba(255, 255, 255, 0.15) 0%,
            transparent 70%
          );
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
