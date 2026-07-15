import { RecordingMode } from '../../shared/types/recording';

interface RecordingModesProps {
  selectedMode: RecordingMode;
  onSelect: (mode: RecordingMode) => void;
}

interface ModeOption {
  mode: RecordingMode;
  label: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  id: string;
}

const MODES: ModeOption[] = [
  {
    mode: RecordingMode.CAMERA_AND_SCREEN,
    label: 'Screen + Camera',
    description: 'Record your screen with your webcam in a floating bubble',
    badge: 'Popular',
    id: 'mode-camera-screen',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        {/* Monitor */}
        <rect x="1" y="3" width="26" height="17" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 24h10M14 20v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        {/* Camera circle PiP */}
        <circle cx="21" cy="16" r="5" fill="var(--purple-dim)" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="21" cy="15.5" r="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M18.5 18.5c.5-1 1.5-1.5 2.5-1.5s2 .5 2.5 1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    mode: RecordingMode.SCREEN,
    label: 'Screen Only',
    description: 'Record your screen and system audio — no camera',
    badge: '',
    id: 'mode-screen',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        {/* Monitor */}
        <rect x="1" y="3" width="26" height="17" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 24h10M14 20v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        {/* Screen lines */}
        <path d="M7 10h14M7 14h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
        {/* Mic icon */}
        <rect x="18" y="9" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M16.5 13.5a3 3 0 006 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M19.5 16.5v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function RecordingModes({ selectedMode, onSelect }: RecordingModesProps) {
  return (
    <div className="recording-modes">
      <p className="recording-modes__label">Choose recording mode</p>
      <div className="recording-modes__grid">
        {MODES.map(({ mode, label, description, badge, icon, id }) => (
          <button
            key={mode}
            id={id}
            className={`mode-card ${selectedMode === mode ? 'mode-card--active' : ''}`}
            onClick={() => onSelect(mode)}
          >
            <div className="mode-card__top">
              <div className="mode-card__icon">{icon}</div>
              {badge && <span className="mode-card__badge">{badge}</span>}
            </div>
            <div className="mode-card__body">
              <span className="mode-card__label">{label}</span>
              <span className="mode-card__desc">{description}</span>
            </div>
            <div className={`mode-card__check ${selectedMode === mode ? 'mode-card__check--active' : ''}`}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        .recording-modes {
          padding: 16px 16px 0;
        }

        .recording-modes__label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin: 0 0 10px;
        }

        .recording-modes__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .mode-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px 12px;
          background: var(--bg-card);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--text-secondary);
          font-family: var(--font-sans);
          text-align: left;
        }

        .mode-card:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-hover);
          color: var(--text-primary);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        }

        .mode-card--active {
          border-color: var(--purple) !important;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%) !important;
          color: var(--text-primary) !important;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15), 0 6px 20px rgba(124, 58, 237, 0.15) !important;
        }

        .mode-card__top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .mode-card__icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          background: var(--bg-subtle);
          transition: background 200ms;
          color: var(--text-secondary);
        }

        .mode-card--active .mode-card__icon {
          background: rgba(124, 58, 237, 0.18);
          color: var(--purple-light);
        }

        .mode-card__badge {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--purple-light);
          background: rgba(124, 58, 237, 0.2);
          border: 1px solid rgba(124, 58, 237, 0.3);
          padding: 2px 6px;
          border-radius: 100px;
        }

        .mode-card__body {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .mode-card__label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .mode-card__desc {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .mode-card__check {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1.5px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 200ms;
          color: transparent;
        }

        .mode-card__check--active {
          background: var(--purple);
          border-color: var(--purple);
          color: white;
        }
      `}</style>
    </div>
  );
}
