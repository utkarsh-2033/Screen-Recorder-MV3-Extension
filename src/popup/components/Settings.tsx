import { VideoQuality } from '../../shared/types/recording';

interface SettingsProps {
  quality: VideoQuality;
  includeMic: boolean;
  audioDeviceId?: string;
  onQualityChange: (q: VideoQuality) => void;
  onMicToggle: (v: boolean) => void;
  onAudioDeviceChange: (id: string) => void;
  audioDevices: MediaDeviceInfo[];
}

const QUALITY_OPTIONS = [
  { value: VideoQuality.SD_720P,   label: '720p HD',   desc: '30fps · Smaller file' },
  { value: VideoQuality.HD_1080P,  label: '1080p FHD', desc: '30fps · Recommended' },
  { value: VideoQuality.QHD_1440P, label: '1440p QHD', desc: '30fps · Highest quality' },
];

export function Settings({
  quality,
  includeMic,
  audioDeviceId,
  onQualityChange,
  onMicToggle,
  onAudioDeviceChange,
  audioDevices,
}: SettingsProps) {
  return (
    <div className="settings animate-fade-in">
      {/* Quality */}
      <div className="settings__group">
        <label className="settings__label">Video Quality</label>
        <div className="quality-options">
          {QUALITY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              className={`quality-btn ${quality === value ? 'quality-btn--active' : ''}`}
              onClick={() => onQualityChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Microphone */}
      <div className="settings__group">
        <div className="settings__row">
          <div className="settings__row-info">
            <label className="settings__label">Microphone</label>
            <span className="text-muted text-xs">Record audio with video</span>
          </div>
          <button
            className={`toggle ${includeMic ? 'toggle--on' : ''}`}
            onClick={() => onMicToggle(!includeMic)}
            role="switch"
            aria-checked={includeMic}
            id="toggle-mic"
          >
            <span className="toggle__thumb" />
          </button>
        </div>
      </div>

      {/* Audio Device Select */}
      {includeMic && audioDevices.length > 0 && (
        <div className="settings__group">
          <label className="settings__label">Microphone Source</label>
          <select
            className="input-base"
            value={audioDeviceId ?? ''}
            onChange={(e) => onAudioDeviceChange(e.target.value)}
          >
            <option value="">Default microphone</option>
            {audioDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <style>{`
        .settings {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          border-top: 1px solid var(--border);
        }
        .settings__group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .settings__label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .settings__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .settings__row-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* Quality buttons */
        .quality-options {
          display: flex;
          gap: 6px;
        }
        .quality-btn {
          flex: 1;
          padding: 7px 8px;
          background: var(--bg-card);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-family: var(--font-sans);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .quality-btn:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
        }
        .quality-btn--active {
          border-color: var(--purple) !important;
          color: var(--purple-light) !important;
          background: var(--purple-dim) !important;
        }

        /* Toggle switch */
        .toggle {
          width: 40px;
          height: 22px;
          background: var(--bg-card);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-full);
          cursor: pointer;
          position: relative;
          transition: all var(--transition-base);
          flex-shrink: 0;
        }
        .toggle--on {
          background: var(--purple);
          border-color: var(--purple);
        }
        .toggle__thumb {
          position: absolute;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          top: 1px;
          left: 1px;
          transition: transform var(--transition-base);
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .toggle--on .toggle__thumb {
          transform: translateX(18px);
        }
      `}</style>
    </div>
  );
}
