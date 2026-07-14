import { RecordingMode } from '../../shared/types/recording';

interface RecordingModesProps {
  selectedMode: RecordingMode;
  onSelect: (mode: RecordingMode) => void;
}

interface ModeOption {
  mode: RecordingMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  id: string;
}

const MODES: ModeOption[] = [
  {
    mode: RecordingMode.TAB,
    label: 'Current Tab',
    description: 'Record this browser tab',
    id: 'mode-tab',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="3" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 7h16" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 5.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="13" cy="5.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    mode: RecordingMode.SCREEN,
    label: 'Entire Screen',
    description: 'Capture your full display',
    id: 'mode-screen',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="2" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 16h6M9 13v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    mode: RecordingMode.WINDOW,
    label: 'Window',
    description: 'Pick a specific window',
    id: 'mode-window',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 6h14" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 4.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="5" y="9" width="8" height="2.5" rx="1" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    mode: RecordingMode.CAMERA,
    label: 'Camera',
    description: 'Record from webcam',
    id: 'mode-camera',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M1 5.5h9.5a1 1 0 011 1V12a1 1 0 01-1 1H2a1 1 0 01-1-1V5.5z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11.5 7.5l4.5-2v7l-4.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="5.5" cy="8.75" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    mode: RecordingMode.MICROPHONE,
    label: 'Microphone',
    description: 'Audio only recording',
    id: 'mode-microphone',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="6" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9a6 6 0 0012 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 15v2M7 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    mode: RecordingMode.CAMERA_AND_SCREEN,
    label: 'Camera + Screen',
    description: 'Picture-in-picture mode',
    id: 'mode-camera-screen',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="2" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="9" width="5" height="4" rx="1" fill="currentColor" opacity="0.4" />
        <circle cx="12.5" cy="11" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

export function RecordingModes({ selectedMode, onSelect }: RecordingModesProps) {
  return (
    <div className="recording-modes">
      <div className="recording-modes__grid">
        {MODES.map(({ mode, label, description, icon, id }) => (
          <button
            key={mode}
            id={id}
            className={`mode-card ${selectedMode === mode ? 'mode-card--active' : ''}`}
            onClick={() => onSelect(mode)}
            title={description}
          >
            <div className="mode-card__icon">{icon}</div>
            <span className="mode-card__label">{label}</span>
          </button>
        ))}
      </div>

      <style>{`
        .recording-modes { padding: 16px 16px 0; }

        .recording-modes__grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .mode-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 8px;
          background: var(--bg-card);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-base);
          color: var(--text-secondary);
          font-family: var(--font-sans);
        }

        .mode-card:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-hover);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .mode-card--active {
          border-color: var(--purple) !important;
          background: var(--purple-dim) !important;
          color: var(--purple-light) !important;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .mode-card__icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          background: var(--bg-subtle);
          transition: background var(--transition-fast);
        }

        .mode-card--active .mode-card__icon {
          background: rgba(124, 58, 237, 0.2);
        }

        .mode-card__label {
          font-size: 11px;
          font-weight: 600;
          text-align: center;
          line-height: 1.3;
        }
      `}</style>
    </div>
  );
}
